import { InputType, Field } from "type-graphql";
import { Length, IsEmail, Matches } from "class-validator";

import { User } from "../../entities/User";

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
