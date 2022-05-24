import { GraphQLScalarType, Kind } from "graphql";
import { ObjectId } from "mongodb";

export const ObjectIdScalar = new GraphQLScalarType({
	name: "ObjectId",
	description: "Mongo object id scalar type",
	serialize(value: unknown): string {
		console.log(value);
		// check the type of received value
		if (value instanceof ObjectId) return value.toHexString();

		if (typeof value === "string") return value;

		throw new Error("ObjectIdScalar can only serialize ObjectId values");
	},
	parseValue(value: unknown): ObjectId {
		// check the type of received value
		if (typeof value !== "string") {
			throw new Error("ObjectIdScalar can only parse string values");
		}
		return new ObjectId(value); // value from the client input variables
	},
	parseLiteral(ast): ObjectId {
		// check the type of received value
		if (ast.kind !== Kind.STRING) {
			throw new Error("ObjectIdScalar can only parse string values");
		}
		return new ObjectId(ast.value); // value from the client query
	},
});
