import {Construct} from 'constructs';
import {Bucket, BucketEncryption, BlockPublicAccess} from "aws-cdk-lib/aws-s3";

import {RemovalPolicy, Stack, StackProps, Tags} from 'aws-cdk-lib';
import {
    MethodLoggingLevel,
    Period,
    AwsIntegration,
    Resource,
    RestApi,
    EndpointType,
    LogGroupLogDestination, AccessLogFormat, UsagePlan, Method
} from 'aws-cdk-lib/aws-apigateway';
import {LogGroup} from "aws-cdk-lib/aws-logs";
import {Role, ServicePrincipal, PolicyStatement} from "aws-cdk-lib/aws-iam";



export class ApiGtwS3Stack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

// Tags

        Tags.of(this).add('Name', 'S3 Proxy Api');
        Tags.of(this).add('Owner', 'ex.malak.przemyslaw@oerlikon.com');

// S3 Bucket

        const bucket = this.getBucket()

// ApiGatewayAccessLogs

        const logGroup = this.getLogGroup();

// Permissions

        const apiExecuteRole = this.getApiGatewayRole(bucket);

// API Gateway - REST

        const api = this.getApiGateway(logGroup);

        const resource = this.addApiResource(api, '{key}');

        const apiIntegration = new AwsIntegration({
            service: "s3",
            integrationHttpMethod: "PUT",
            path: `${bucket.bucketName}/{key}`,
            options: {
                credentialsRole: apiExecuteRole,
                integrationResponses: [
                    {
                        statusCode: "200",
                        responseParameters: {
                            "method.response.header.Content-Type": "integration.response.header.Content-Type",
                        },
                    },
                ],
                requestParameters: {
                    "integration.request.path.key": "method.request.path.key",
                },
            },
        });

        const putFileMethod = this.addPutMethod(resource, apiIntegration);

    }

    private addPutMethod(resource: Resource, apiIntegration: AwsIntegration) {
        const putFileMethod = resource.addMethod(
            'PUT',
            apiIntegration,
            {
                //apiKeyRequired: true,
                methodResponses: [
                    {
                        statusCode: "200",
                        responseParameters: {
                            "method.response.header.Content-Type": true,
                        },
                    },
                ],
                requestParameters: {
                    "method.request.path.folder": true,
                    "method.request.path.key": true,
                    "method.request.header.Content-Type": true,
                },
            }
        );
        return putFileMethod;
    }

    private addApiResource(api: RestApi, key: string) {
        const resource = api.root.addResource(
            key
        );
        return resource;
    }

    private getApiGateway(logGroup: LogGroup) {
        const api = new RestApi(
            this,
            'Api',
            {
                description: 'S3 Proxy Api',
                binaryMediaTypes: ['*/*'],
                minimumCompressionSize: 0,
                cloudWatchRole: true,
                endpointTypes: [EndpointType.EDGE],
                deployOptions: {
                    stageName: 'dev',
                    tracingEnabled: true,
                    accessLogDestination: new LogGroupLogDestination(logGroup),
                    accessLogFormat: AccessLogFormat.clf(),
                    loggingLevel: MethodLoggingLevel.INFO,
                    metricsEnabled: true,
                },
            }
        );
        return api;
    }

    private getApiGatewayRole(bucket: Bucket) {
        const apiExecuteRole = new Role(
            this,
            'api-gateway-s3-assume-role', {
                assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
                roleName: "API-Gateway-S3-Integration-Role",
            });


        bucket.grantPut(apiExecuteRole);
        return apiExecuteRole;
    }

    private getLogGroup() {
        const logGroup = new LogGroup(this, "ApiGatewayAccessLogs");
        return logGroup;
    }

    private getBucket() {
        return new Bucket(
            this,
            'Filesbucket',
            {
                autoDeleteObjects: true,
                removalPolicy: RemovalPolicy.DESTROY,
                encryption: BucketEncryption.S3_MANAGED,
                blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            }
        );
    }
}
