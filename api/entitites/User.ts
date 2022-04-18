import {
	ArgumentValidationError,
	Field,
	ID,
	Int,
	ObjectType,
} from "type-graphql";
import { ObjectId } from "mongodb";
import {
	getModelForClass,
	Index,
	pre,
	prop as Property,
} from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { hash } from "bcrypt";

@ObjectType()
class Address {
	@Field()
	@Property()
	street: string;

	@Field()
	@Property()
	city: string;

	@Field(() => Int)
	@Property()
	postal: number;

	@Field()
	@Property()
	country: string;
}

@ObjectType({ description: "User's billing information" })
class Billing {
	@Field()
	@Property()
	name: string;

	@Field(() => Int)
	@Property()
	ICO: number;

	@Field(() => Int)
	@Property()
	DIC: number;

	@Field()
	@Property()
	ICDPH: string;

	@Field(() => Address)
	@Property()
	address: Address;
}

@pre<User>("save", async function () {
	if (this.isNew || this.isModified("password")) {
		this.password = await hash(this.password, 12);
	}
	if (this.isNew || this.isModified("email")) {
		const emailExists = await getModelForClass(User)
			.findOne({ email: this.email })
			.exec();
		if (emailExists && emailExists.id !== this.id) {
			throw new ArgumentValidationError([
				{
					target: User, // Object that was validated.
					property: "email", // Object's property that haven't pass validation.
					value: this.email, // Value that haven't pass a validation.
					constraints: {
						// Constraints that failed validation with error messages.
						EmailExists: "Submitted email address is already in use!",
					},
					//children?: ValidationError[], // Contains all nested validation errors of the property
				},
			]);
		}
	}
})
@Index(
	{ createdAt: 1 },
	{
		expireAfterSeconds: 60 * 60 * 24,
		partialFilterExpression: { verified: false },
	}
)
@ObjectType({ description: "The user model entity" })
export class User extends TimeStamps {
	@Field(() => ID)
	id: ObjectId;

	@Field()
	@Property()
	name: string;

	@Field()
	@Property()
	email: string;

	@Property()
	password: string;

	@Field(() => Int, { nullable: true })
	@Property()
	telephone?: number;

	@Field()
	@Property()
	organisation: string;

	@Field(() => [Billing])
	@Property({ type: () => [Billing], default: [] })
	billings: Billing[];

	@Field()
	@Property({ default: false })
	verified: boolean;

	@Field()
	createdAt: Date;
	@Field()
	updatedAt: Date;
}
