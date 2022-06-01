import { InputType, Field, ArgsType, Int } from "type-graphql";
import {
	Length,
	IsEmail,
	Matches,
	Min,
	Max,
	IsPhoneNumber,
} from "class-validator";
import { ObjectId } from "mongodb";

import { Address, Billing, User } from "../../entitites/User";
import { RefDocExists } from "../../util/validation";

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
	@Length(1, 100, { message: "Name can must be 1-100 characters long!" })
	name: string;

	@Field()
	@IsEmail()
	email: string;

	@Field()
	@Length(1, 100, {
		message: "Name of the organisation must be 1-200 characters long!",
	})
	organisation: string;

	@Field()
	@IsPhoneNumber()
	telephone: string;
}

@InputType({ description: "User update input data" })
export class UserInput implements Partial<User> {
	@Field()
	@Length(1, 100, { message: "Name must be 1-100 characters long!" })
	name: string;

	@Field()
	@IsEmail()
	email: string;

	@Field()
	@Length(1, 100, {
		message: "Name of the organisation must be 1-200 characters long!",
	})
	organisation: string;

	@Field()
	@IsPhoneNumber()
	telephone: string;
}

@InputType()
class AddressInput implements Address {
	@Field()
	@Length(1, 100, { message: "Street must be 1-100 characters long!" })
	street: string;

	@Field()
	@Length(1, 100, { message: "City must be 1-100 characters long!" })
	city: string;

	@Field()
	@Length(1, 20, { message: "Postal code be 1-20 characters long!" })
	postal: string;

	@Field()
	@Length(1, 50, { message: "Country name be 1-50 characters long!" })
	country: string;
}

@InputType()
export class BillingInput implements Partial<Billing> {
	@Field()
	@Length(1, 100, { message: "Name must be 1-100 characters long!" })
	name: string;

	@Field(() => AddressInput)
	address: AddressInput;

	@Field()
	DIC: string;

	@Field()
	ICDPH: string;

	@Field()
	ICO: string;

	@Field({ nullable: true })
	IBAN?: string;

	@Field({ nullable: true })
	SWIFT?: string;
}
