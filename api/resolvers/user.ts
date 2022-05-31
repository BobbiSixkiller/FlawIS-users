import { Arg, Args, Ctx, Query, Resolver } from "type-graphql";
import { ObjectId } from "mongodb";
import { Service } from "typedi";
import { User } from "../entitites/User";
import { CRUDservice } from "../services/CRUDservice";
import { Mutation } from "type-graphql";
import {
	BillingInput,
	PasswordInput,
	RegisterInput,
	UserArgs,
	UserConnection,
	UserInput,
} from "./types/user";
import { transformIds } from "../util/typegoose-middleware";
import { AuthenticationError, UserInputError } from "apollo-server-core";

import { Context, signJwt, verifyJwt } from "../util/auth";
import { compare } from "bcrypt";
import { Authorized } from "type-graphql";
import { sendMail } from "../util/mail";
import { ResetToken } from "../util/types";

@Service()
@Resolver()
export class UserResolver {
	constructor(private readonly userService = new CRUDservice(User)) {}

	@Authorized(["ADMIN", "SUPERVISOR", "IS_OWN_USER"])
	@Query(() => User)
	async user(@Arg("id") id: ObjectId): Promise<User> {
		const user = await this.userService.findOne({ _id: id });
		if (!user) throw new Error("User not found!");

		return user;
	}

	@Authorized("ADMIN", "SUPERVISOR")
	@Query(() => UserConnection)
	async users(
		@Args() { first, after, last, before }: UserArgs
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

	@Authorized()
	@Query(() => User)
	async me(@Ctx() { user }: Context): Promise<User> {
		const loggedInUser = await this.userService.findOne({ _id: user?.id });
		if (!loggedInUser)
			throw new AuthenticationError("User account has been deleted!");

		return loggedInUser;
	}

	@Mutation(() => User)
	async register(
		@Arg("data") registerInput: RegisterInput,
		@Ctx() { res }: Context
	) {
		const user = await this.userService.create(registerInput);

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

	@Query(() => String)
	async forgotPassword(@Arg("email") email: string): Promise<string> {
		const user = await this.userService.findOne({ email });
		if (!user)
			throw new UserInputError("No user with provided email address found!");

		const token = signJwt({ id: user.id }, { expiresIn: "1h" });

		sendMail(
			email,
			"Password Reset",
			`Reset password with the following token: ${token}`,
			`<html><head></head><body><p>Dear ${user.name}</p><p>Please reset your password with the following token: ${token}</p></body></html>`,
			[]
		);

		return "Password reset link has been sent to your email!";
	}

	@Mutation(() => User)
	async passwordReset(
		@Arg("data") { password }: PasswordInput,
		@Ctx() { req }: Context
	): Promise<User> {
		const token = req.headers.passwordToken;
		console.log(token, req.headers);
		const userId: ResetToken = verifyJwt(token as string);
		if (!userId) throw new Error("Reset token expired!");

		const user = await this.userService.findOne({ _id: userId.id });
		if (!user) throw new Error("User not found!");

		user.password = password;

		return await user.save();
	}

	@Authorized(["ADMIN", "SUPERVISOR", "IS_OWN_USER"])
	@Mutation(() => User)
	async updateUser(
		@Arg("id") id: ObjectId,
		@Arg("data") userInput: UserInput
	): Promise<User> {
		const user = await this.userService.findOne({ _id: id });
		if (!user) throw new UserInputError("User not found!");

		for (const [key, value] of Object.entries(userInput)) {
			user[key as keyof UserInput] = value;
		}

		return await user.save();
	}

	//Mutation used to save newly added billing while registering for a conference
	@Authorized()
	@Mutation(() => User)
	async updateBilling(
		@Ctx() { user }: Context,
		@Arg("data") billingData: BillingInput
	): Promise<User> {
		const loggedInUser = await this.userService.findOne({ _id: user?.id });
		if (!loggedInUser) throw new UserInputError("User not found!");

		const billing = loggedInUser.billings.find(
			(billing) => billing.name === billingData.name
		);
		if (billing) {
			billing.address = billingData.address;
			billing.DIC = billingData.DIC;
			billing.ICO = billingData.ICO;
			billing.ICDPH = billingData.ICDPH;
		} else {
			loggedInUser.billings.push(billingData);
		}

		return await loggedInUser.save();
	}

	@Authorized(["ADMIN"])
	@Mutation(() => Boolean)
	async deleteUser(@Arg("id") id: ObjectId): Promise<boolean> {
		const { deletedCount } = await this.userService.delete({ _id: id });
		return deletedCount > 0;
	}
}
