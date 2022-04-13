import "reflect-metadata";

import env from "dotenv";
import Container from "typedi";

env.config();

async function main() {
	//Build schema
	const schema = await buildSchema({
		resolvers: [],
		// use document converting middleware
		globalMiddlewares: [TypegooseMiddleware],
		// use ObjectId scalar mapping
		scalarsMap: [{ type: ObjectId, scalar: ObjectIdScalar }],
		emitSchemaFile: true,
		authChecker,
		container: Container,
		//disabled validation for dev purposes
		//validate: false,
	});

	const app = Express();
	const redisClient = createClient();
	redisClient.on("error", console.error);
	await redisClient.connect();

	app.use(Express.static("public"));
	app.use(cookieParser());
	app.use(
		cors({
			origin: ["http://localhost:3000", "http://localhost:5001"],
			credentials: true,
		})
	);
	app.use(
		(
			req: Express.Request,
			res: Express.Response,
			next: Express.NextFunction
		): void => {
			if (req.originalUrl === "/webhook") {
				next();
			} else {
				Express.json()(req, res, next);
			}
		}
	);
	app.use("/webhook", stripeWebhook);

	//Create Apollo server
	const server = new ApolloServer({
		schema,
		context: ({ req, res }) =>
			createContext({ req, res, redisClient, user: null }),
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
