import { ObjectId } from "mongodb";
import { ClassType, Field, ObjectType } from "type-graphql";

//generic function for creating corresponding Connection Type enabling relay style pagination
export default function CreateConnection<TNode>(TNodeClass: ClassType<TNode>) {
	// `isAbstract` decorator option is mandatory to prevent registering in schema
	@ObjectType(`${TNodeClass.name}Edge`)
	abstract class Edge {
		@Field(() => TNodeClass) // here we use the runtime argument
		node: TNode; // and here the generic type

		@Field()
		cursor: ObjectId;
	}

	@ObjectType({ isAbstract: true })
	abstract class PageInfo {
		@Field()
		startCursor: ObjectId;

		@Field()
		hasPreviousPage: boolean;

		@Field()
		endCursor: ObjectId;

		@Field()
		hasNextPage: boolean;
	}

	@ObjectType({ isAbstract: true })
	abstract class Connection {
		@Field(() => [Edge])
		edges: Edge[];

		@Field(() => PageInfo)
		pageInfo: PageInfo;
	}

	return Connection;
}
