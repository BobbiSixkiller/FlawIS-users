import {
	registerDecorator,
	ValidationArguments,
	ValidationOptions,
	ValidatorConstraint,
	ValidatorConstraintInterface,
} from "class-validator";
import { getModelForClass } from "@typegoose/typegoose";

@ValidatorConstraint({ name: "RefDoc", async: true })
class RefDocValidator implements ValidatorConstraintInterface {
	async validate(refId: string, args: ValidationArguments) {
		const modelClass = args.constraints[0];
		return await getModelForClass(modelClass).exists({ _id: refId });
	}

	defaultMessage(): string {
		return "Referenced Document not found!";
	}
}

export function RefDocExists(
	modelClass: any,
	validationOptions?: ValidationOptions
) {
	return function (object: Object, propertyName: string) {
		registerDecorator({
			name: "RefDocExists",
			target: object.constructor,
			propertyName: propertyName,
			constraints: [modelClass],
			options: validationOptions,
			validator: RefDocValidator,
		});
	};
}

@ValidatorConstraint({ name: "NameExists", async: true })
class NameExistsValidator implements ValidatorConstraintInterface {
	async validate(name: string, args: ValidationArguments) {
		const modelClass = args.constraints[0];
		const nameExists = await getModelForClass(modelClass).findOne({
			name: name.toLowerCase(),
		});

		if (nameExists) {
			return false;
		} else return true;
	}

	defaultMessage(): string {
		return "Document with provided name already exists!";
	}
}

export function NameExists(
	modelClass: any,
	validationOptions?: ValidationOptions
) {
	return function (object: Object, propertyName: string) {
		registerDecorator({
			name: "NameExists",
			target: object.constructor,
			propertyName: propertyName,
			constraints: [modelClass],
			options: validationOptions,
			validator: NameExistsValidator,
		});
	};
}
