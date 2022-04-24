import { Arg, Args, Ctx, Query, Resolver } from "type-graphql";
import { ObjectId } from "mongodb";
import { Service } from "typedi";
import { User } from "../entitites/User";
import { CRUDservice } from "../services/CRUDservice";
import { Mutation } from "type-graphql";
import { RegisterInput, UserArgs, UserConnection } from "./types/user";
import { transformIds } from "../util/typegoose-middleware";
import { AuthenticationError } from "apollo-server-core";

import { Context } from "../util/auth";
import { compare } from "bcrypt";
import { Authorized } from "type-graphql";

@Service()
@Resolver()
export class UserResolver {
	constructor(private readonly userService = new CRUDservice(User)) {}

	@Authorized(["read:own_account"])
	@Query(() => User)
	async user(@Arg("id") id: ObjectId): Promise<User> {
		const user = await this.userService.findOne({ _id: id });
		if (!user) throw new Error("User not found!");

		return user;
	}

	@Authorized("ADMIN", "SUPERVISOR")
	@Query(() => UserConnection)
	async users(
		@Args() { first, after, last, before }: UserArgs,
		@Ctx() { user }: Context
	): Promise<UserConnection> {
		const users = await this.userService.aggregate([
			//sort based on the latest user created
			{ $sort: { _id: -1 } },
			{
				$match: {
					$expr: {
						$cond: [
							{ $and: [{ $eq: [before, null] }, { $eq: [after, null] }] },
							{ $ne: ["$_id", null] }, //return all sorted documents
							{
								$cond: [
									{ $eq: [before, null] },
									{ $lt: ["$_id", new ObjectId(after)] }, //newer users
									{ $gt: ["$_id", new ObjectId(before)] }, //older users
								],
							},
						],
					},
				},
			},
			{ $limit: last || first || 20 },
		]);

		return {
			edges: users.map((user) => ({
				cursor: user?._id,
				node: transformIds(user),
			})),
			pageInfo: {
				startCursor: users[0]._id,
				hasPreviousPage:
					(await this.userService.exists({
						_id: { $gt: users[0]._id },
					})) !== null,
				endCursor: users[users.length - 1]._id,
				hasNextPage:
					(await this.userService.exists({
						_id: { $lt: users[users.length - 1]._id },
					})) !== null,
			},
		};
	}

	@Mutation(() => User)
	async register(
		@Arg("data")
		{ email, name, organisation, password, telephone }: RegisterInput,
		@Ctx() { res }: Context
	) {
		const user = await this.userService.create({
			email,
			password,
			name,
			organisation,
			telephone,
		});

		res.cookie("accessToken", user.token, {
			httpOnly: true,
			maxAge: 60 * 60 * 1000 * 24 * 7,
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			secure: process.env.NODE_ENV === "production",
		});

		return user;
	}

	@Mutation(() => User)
	async login(
		@Arg("email") email: string,
		@Arg("password") password: string,
		@Ctx() { res }: Context
	): Promise<User> {
		const user = await this.userService.findOne({ email });
		if (!user) throw new AuthenticationError("Invalid credentials!");

		const match = await compare(password, user.password);
		if (!match) throw new AuthenticationError("Invalid credentials!");

		res.cookie("accessToken", user.token, {
			httpOnly: true,
			maxAge: 60 * 60 * 1000 * 24 * 7,
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			secure: process.env.NODE_ENV === "production",
		});

		return user;
	}

	@Authorized()
	@Mutation(() => Boolean)
	logout(@Ctx() { res }: Context) {
		res.clearCookie("accessToken");

		return true;
	}

	async updateUser() {}

	async deleteUser() {}
}
