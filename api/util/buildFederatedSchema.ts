import { printSchemaWithDirectives } from "@graphql-tools/utils";
import { buildSubgraphSchema } from "@apollo/federation";
import { GraphQLResolverMap, addResolversToSchema } from "apollo-graphql";
import {
	DirectiveLocation,
	GraphQLDirective,
	GraphQLResolveInfo,
	GraphQLSchema,
} from "graphql";
import gql from "graphql-tag";
import {
	BuildSchemaOptions,
	buildSchema,
	createResolversMap,
} from "type-graphql";

import GraphQLJSON from "graphql-type-json";

export const defaultDirectives = `
directive @tag(name: String!) repeatable on FIELD_DEFINITION

enum CacheControlScope {
  PUBLIC
  PRIVATE
}

directive @cacheControl(
  maxAge: Int
  scope: CacheControlScope
  inheritMaxAge: Boolean
) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION

`;

export const fed2extension = `
extend schema
@link(url: "https://specs.apollo.dev/federation/v2.0",
      import: ["@key", "@external", "@provides", "@requires", "@extends", "@shareable"])`;

export const fed2Directives = `
scalar link__Import

directive @link(
  url: String!,
  import: [link__Import],
) repeatable on SCHEMA

${fed2extension}
`;

export const ShareableDirective = new GraphQLDirective({
	name: "shareable",
	locations: [DirectiveLocation.OBJECT, DirectiveLocation.FIELD_DEFINITION],
});

export async function buildFederatedSchema(
	options: Omit<BuildSchemaOptions, "skipCheck">,
	referenceResolvers?: GraphQLResolverMap<any>,
	fed2: boolean = false
): Promise<GraphQLSchema> {
	if (fed2) {
		const directivesWithNoDefinitionNeeded =
			// eslint-disable-next-line import/no-extraneous-dependencies
			require("@apollo/subgraph/dist/directives").directivesWithNoDefinitionNeeded;
		const knownSubgraphDirectives =
			// eslint-disable-next-line import/no-extraneous-dependencies
			require("@apollo/subgraph/dist/directives").knownSubgraphDirectives;
		knownSubgraphDirectives.find(
			(d: GraphQLDirective) => d.name === "key"
		)!.isRepeatable = true;
		directivesWithNoDefinitionNeeded.push(ShareableDirective);
		knownSubgraphDirectives.push(ShareableDirective);
		console.log("fed2 enabled schema!");
	}
	const schema = await buildSchema({
		...options,
		skipCheck: true,
		scalarsMap: [
			...(options.scalarsMap ?? []),
			{
				scalar: GraphQLJSON,
				type: () => `GraphQLJSON`,
			},
		],
	});

	const federatedSchema = buildSubgraphSchema({
		typeDefs: gql(
			printSchemaWithDirectives(schema) +
				defaultDirectives +
				(fed2 ? fed2Directives : "")
		),
		resolvers: createResolversMap(schema) as any,
	});

	if (referenceResolvers) {
		addResolversToSchema(federatedSchema, referenceResolvers);
	}

	if (fed2) {
		console.log(
			`enabling federation 2.0 for service ${process.env.SERVICE_NAME}`
		);
		const _service = federatedSchema.getQueryType()?.getFields()?._service;

		const sdl = _service?.resolve?.(
			undefined,
			{},
			undefined,
			{} as GraphQLResolveInfo
		);
		if (_service) {
			if (sdl && sdl.sdl) {
				_service.resolve = () => {
					return {
						sdl: sdl.sdl + fed2extension,
					};
				};
			}
		}
	}
	return federatedSchema;
}
