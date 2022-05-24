import {
	ArgumentValidationError,
	Directive,
	Field,
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
import { signJwt } from "../util/auth";

@ObjectType()
export class Address {
	@Field()
	@Property()
	street: string;

	@Field()
	@Property()
	city: string;

	@Field()
	@Property()
	postal: string;

	@Field()
	@Property()
	country: string;
}

@ObjectType({ description: "User's billing information" })
export class Billing {
	@Field({ nullable: true })
	id?: ObjectId;

	@Field()
	@Property()
	name: string;

	@Field({ nullable: true })
	@Property()
	ICO?: string;

	@Field({ nullable: true })
	@Property()
	DIC?: string;

	@Field({ nullable: true })
	@Property()
	ICDPH?: string;

	@Field({ nullable: true })
	@Property()
	IBAN?: string;

	@Field({ nullable: true })
	@Property()
	SWIFT?: string;

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
	if (this.isNew && (this.isFlaw || this.isUniba)) {
		this.billings.push({
			name: "Univerzita Komenského v Bratislave, Právnická fakulta",
			ICO: "00397865",
			DIC: "2020845332",
			ICDPH: "SK2020845332",
			address: {
				street: "Šafárikovo nám. 6",
				city: "Bratislava",
				postal: "81000",
				country: "Slovensko",
			},
		});
	}
})
@Index({ name: "text" })
@Directive('@key(fields: "id")')
@ObjectType({ description: "The user model entity" })
export class User extends TimeStamps {
	@Field()
	id: ObjectId;

	@Field()
	@Property()
	email: string;

	@Property()
	password: string;

	@Field()
	@Property({ default: "BASIC", enum: ["BASIC", "SUPERVISOR", "ADMIN"] })
	role: string;

	@Field(() => [String])
	@Property({
		type: () => [String],
		default: [],
	})
	permissions: string[];

	@Field()
	@Property()
	name: string;

	@Field({ nullable: true })
	@Property()
	telephone?: string;

	@Field()
	@Property()
	organisation: string;

	@Field(() => [Billing])
	@Property({ type: () => [Billing], default: [] })
	billings: Billing[];

	@Field()
	createdAt: Date;
	@Field()
	updatedAt: Date;

	get token(): string {
		return (
			"Bearer " +
			signJwt(
				{
					id: this.id,
					email: this.email,
					name: this.name,
					role: this.role,
					permissions: this.permissions,
				},
				{ expiresIn: "7d" }
			)
		);
	}

	get isFlaw(): boolean {
		return this.email.split("@")[1] === "flaw.uniba.sk";
	}

	get isUniba(): boolean {
		return this.email.split("@")[1] === "uniba.sk";
	}
}
