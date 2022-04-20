import { InputType, Field, ObjectType, ArgsType, Int } from "type-graphql";
import { Length, IsEmail, Matches, Min, Max } from "class-validator";
import { ObjectId } from "mongodb";

import { User } from "../../entitites/User";
import CreateConnection from "./pagination";
import { RefDocExists } from "../../util/validation";

@ObjectType({
	description: "UserConnection type enabling cursor based pagination",
})
export class UserConnection extends CreateConnection(User) {}

@ArgsType()
export class UserArgs {
	@Field(() => String, { nullable: true })
	@RefDocExists(User, {
		message: "Cursor's document not found!",
	})
	after?: ObjectId;

	@Field(() => Int, { defaultValue: 20, nullable: true })
	@Min(1)
	@Max(50)
	first?: number;

	@Field(() => String, { nullable: true })
	@RefDocExists(User, {
		message: "Cursor's document not found!",
	})
	before?: ObjectId;

	@Field(() => Int, { defaultValue: 20, nullable: true })
	@Min(1)
	@Max(50)
	last?: number;
}

@InputType()
export class PasswordInput implements Partial<User> {
	@Field()
	@Matches(/^[a-zA-Z0-9!@#$&()\\-`.+,/\"]{8,}$/, {
		message: "Minimum 8 characters, at least 1 letter and 1 number!",
	})
	password: string;
}

@InputType({ description: "New user input data" })
export class RegisterInput extends PasswordInput implements Partial<User> {
	@Field()
	@Length(1, 100, { message: "Name can be max 100 characters long!" })
	name: string;

	@Field()
	@IsEmail()
	email: string;
}

@InputType({ description: "User update input data" })
export class UserInput implements Partial<User> {
	@Field()
	@Length(1, 100, { message: "Name can be max 100 characters long!" })
	name: string;

	@Field()
	@IsEmail()
	email: string;
}
