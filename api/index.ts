import "reflect-metadata";
import Container from "typedi";
import Express from "express";
import { ApolloServer } from "apollo-server-express";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";

import { connect } from "mongoose";
import { buildSchema } from "type-graphql";

import { ObjectId } from "mongodb";
import { ObjectIdScalar } from "./util/scalars";
import { TypegooseMiddleware } from "./util/typegoose-middleware";
import { ApolloComplexityPlugin } from "./util/ApolloComplexityPlugin";

import { UserResolver } from "./resolvers/user";

import env from "dotenv";

env.config();

async function main() {
	//Build schema
	const schema = await buildSchema({
		resolvers: [UserResolver],
		// use document converting middleware
		globalMiddlewares: [TypegooseMiddleware],
		// use ObjectId scalar mapping
		scalarsMap: [{ type: ObjectId, scalar: ObjectIdScalar }],
		emitSchemaFile: true,
		container: Container,
		//disabled validation for dev purposes
		//validate: false,
	});

	const app = Express();
	app.use(Express.json());

	//Create Apollo server
	const server = new ApolloServer({
		schema,
		// context: ({ req, res }) =>
		// 	createContext({ req, res, redisClient, user: null }),
		plugins: [
			ApolloServerPluginLandingPageGraphQLPlayground,
			new ApolloComplexityPlugin(1000),
		],
	});

	await server.start();

	server.applyMiddleware({
		app,
		path: "/graphql",
		cors: false,
		bodyParserConfig: false,
	});

	// create mongoose connection
	const mongoose = await connect(
		process.env.DB_DEV_ATLAS || "mongodb://localhost:27017/test"
	);
	console.log(mongoose.connection && "Database connected!");

	app.listen({ port: process.env.PORT || 5001 }, () =>
		console.log(
			`🚀 Server ready and listening at ==> http://localhost:${
				process.env.PORT || 5001
			}${server.graphqlPath}`
		)
	);
}

main().catch((error) => {
	console.log(error, "error");
});
