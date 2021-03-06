

const graphql = require('graphql')

exports.graphql = graphql

const {
  makeExecutableSchema,
} = require('graphql-tools')

const {
    GraphQLJSONObject,
    GraphQLJSON,
} = require('graphql-type-json')

const {
    GraphQLDate,
    GraphQLTime,
    GraphQLDateTime
} = require('graphql-iso-date')

const resolveFunctions = {
    JSON: GraphQLJSON,
    JSONObject: GraphQLJSONObject,
    Date: GraphQLDate,
    Time: GraphQLTime,
    DateTime: GraphQLDateTime,
}

const buildSchema = (typeDefs, resolvers) => {
    return makeExecutableSchema({
        typeDefs,
        resolvers: {
            ...resolveFunctions,
            ...resolvers,
        },
    })
}

exports.buildSchema = buildSchema

const ghttp = require('express-graphql')

const getOperationUrl = (document, operationName) => {
    if (!document) return

    const definitions = document.definitions.filter(definition => definition.kind === 'OperationDefinition')

    if (definitions.length === 0) return

    const definition = definitions.find(d => d.name && d.name.value === operationName) || definitions[0]

    const selectionNames = definition.selectionSet.selections.map(selection => selection.name.value).sort().join(',')

    return `/${definition.operation}/${selectionNames}`
}

exports.getOperationUrl = getOperationUrl

const scalarify = (schema) => `
scalar JSON
scalar JSONObject
scalar Date
scalar Time
scalar DateTime
${schema}
`
exports.scalarify = scalarify

const graphiql = ({
    api,
    schema,
    resolver,
}) => {

    schema = scalarify(schema)

    schema = buildSchema(schema, resolver)

    return ghttp(async (req, res) => {
        const startTime = Date.now()

        const rootValue = typeof api === 'function' ? await api(req) : api

        return {
            schema,
            rootValue,
            graphiql: true,
            customFormatErrorFn: error => ({
                message: error.message,
                stack: error.stack,
            }),
            extensions: ({
                document,
                operationName,
                result,
            }) => {
                const operationUrl = getOperationUrl(document, operationName)
                req.graphqlUrl = operationUrl

                if (Array.isArray(result.errors) && result.errors.length > 0) {
                    res.status(400)
                }
                return {
                    took: Date.now() - startTime,
                }
            },
        }
    })
}

exports.graphiql = graphiql
