# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## How to test
This CDK project deploys a Lambda Function called "HelloWorld". The state machine just takes a name
of a lambda function and tries to invoke it. If it can't, it will open the circuit. If it can, there
is no change. Default TTL is 1 minute.

**Good Execution**
```json
{
    "targetLambda": "HelloWorld"
}
```

**Bad Execution**
```json
{
    "targetLambda": "Literally any function that either doesn't exist or the state machine does not have permission to invoke"
}
```
**AWS CLI Good Command**
```sh
aws [--profile ${profile}] stepfunctions start-sync-execution --step-function-arn ${arn} --input "{\"targetLambda\": \"HelloWorld\"}" | jq
```

**AWS CLI Bad Command**
```sh
aws [--profile ${profile}] stepfunctions start-sync-execution --step-function-arn ${arn} --input "{\"targetLambda\": \"DNE\"}" | jq
```
```
