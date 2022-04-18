import { Arg, Query, Resolver } from "type-graphql";
import { ObjectId } from "mongodb";
import { Service } from "typedi";
import { User } from "../entitites/User";
import { CRUDservice } from "../services/CRUDservice";
import { Mutation } from "type-graphql";

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

	@Query(() => [User])
	async users(): Promise<User[]> {
		return await this.userService.findAll({});
	}

	@Mutation(() => User)
	async register() {}

	async login() {}

	async updateUser() {}

	async deleteUser() {}
}
