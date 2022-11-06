#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiGtwS3Stack } from '../lib/api-gtw-s3-stack';

const app = new cdk.App();
new ApiGtwS3Stack(app, 'ApigtwS3Stack', {

  env: { region: 'eu-central-1' },
});