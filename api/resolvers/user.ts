import { Arg, Args, Query, Resolver } from "type-graphql";
import { ObjectId } from "mongodb";
import { Service } from "typedi";
import { User } from "../entitites/User";
import { CRUDservice } from "../services/CRUDservice";
import { Mutation } from "type-graphql";
import { UserArgs, UserConnection } from "./types/user";
import { transformIds } from "../util/typegoose-middleware";

@Service()
@Resolver()
export class UserResolver {
	constructor(private readonly userService = new CRUDservice(User)) {}

	@Query(() => User)
	async user(@Arg("id") id: ObjectId): Promise<User> {
		const user = await this.userService.findOne({ _id: id });
		if (!user) throw new Error("User not found!");

		return user;
	}

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
			edges: users.map((product) => ({
				cursor: product?._id,
				node: transformIds(product),
			})),
			pageInfo: {
				startCursor: users[0]._id,
				hasPreviousPage: (await this.userService.exists({
					_id: { $gt: users[0]._id },
				})) as boolean,
				endCursor: users[users.length - 1]._id,
				hasNextPage: (await this.userService.exists({
					_id: { $lt: users[users.length - 1]._id },
				})) as boolean,
			},
		};
	}

	@Mutation(() => User)
	async register() {}

	async login() {}

	async updateUser() {}

	async deleteUser() {}
}
