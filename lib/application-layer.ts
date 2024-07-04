import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Chain, Choice, Condition, CustomState, DefinitionBody, Errors, Fail, LogLevel, StateMachine, StateMachineType, Succeed } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { join } from 'path';

export interface ApplicationStackProps extends StackProps {
  table: TableV2;
  circuit: string;
  ttlDuration: string;
}

export class ApplicationLayer extends Stack {
  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    const helloWorldLambda = new Function(this, 'HelloWorld', {
      functionName: 'HelloWorld',
      runtime: Runtime.PROVIDED_AL2023,
      code: Code.fromAsset(join(__dirname, '..'), {
        bundling: {
          image: Runtime.PROVIDED_AL2023.bundlingImage,
          user: 'root',
          command: [
            '/bin/sh',
            '-c',
            'GOOS=linux go build -tags lambda.norpc -o /asset-output/bootstrap cmd/hello-world/main.go',
          ],
          volumes: [
            {
              hostPath: `${process.env.HOME}/go`,
              containerPath: '/root/go',
            },
          ],
        }
      }),
      handler: 'bootstrap',
    });

    const getCircuitBreakerLambda = new Function(this, 'GetCircuitBreakerStatus', {
      functionName: 'GetCircuitBreakerStatus',
      runtime: Runtime.PROVIDED_AL2023,
      code: Code.fromAsset(join(__dirname, '..'), {
        bundling: {
          image: Runtime.PROVIDED_AL2023.bundlingImage,
          user: 'root',
          command: [
            '/bin/sh',
            '-c',
            'GOOS=linux go build -tags lambda.norpc -o /asset-output/bootstrap cmd/get-circuit-breaker-status/main.go',
          ],
          volumes: [
            {
              hostPath: `${process.env.HOME}/go`,
              containerPath: '/root/go',
            },
          ],
        }
      }),
      handler: 'bootstrap',
      environment: {
        DDB_TABLE_NAME: props.table.tableName,
        DDB_CIRCUIT_NAME: props.circuit,
      },
    });
    props.table.grantReadData(getCircuitBreakerLambda);

    const updateCircuitBreakerLambda = new Function(this, 'UpdateCircuitBreakerStatus', {
      functionName: 'UpdateCircuitBreakerStatus',
      runtime: Runtime.PROVIDED_AL2023,
      code: Code.fromAsset(join(__dirname, '..'), {
        bundling: {
          image: Runtime.PROVIDED_AL2023.bundlingImage,
          user: 'root',
          command: [
            '/bin/sh',
            '-c',
            'GOOS=linux go build -tags lambda.norpc -o /asset-output/bootstrap cmd/update-circuit-breaker-status/main.go',
          ],
          volumes: [
            {
              hostPath: `${process.env.HOME}/go`,
              containerPath: '/root/go',
            },
          ],
        }
      }),
      handler: 'bootstrap',
      environment: {
        DDB_TABLE_NAME: props.table.tableName,
        DDB_CIRCUIT_NAME: props.circuit,
        DDB_TIME_TO_LIVE_DURATION: props.ttlDuration,
      },
    });
    props.table.grantWriteData(updateCircuitBreakerLambda);

    const circuitOpen = new Fail(this, 'CiruitOpen')
    const circuitClosed = new Succeed(this, 'CiruitClosed')
    const getCircuitBreakerStatusTask = new LambdaInvoke(this, 'GetCircuitStatus', {
      stateName: 'Get Circuit Status',
      comment: 'Get Circuit Status',
      lambdaFunction: getCircuitBreakerLambda,
      payloadResponseOnly: true,
    })
    const updateCircuitBreakerStatusTask = new LambdaInvoke(this, 'UpdateCircuitStatus', {
      stateName: 'Update Circuit Status',
      comment: 'Update Circuit Status',
      lambdaFunction: updateCircuitBreakerLambda,
      payloadResponseOnly: true,
    }).next(circuitOpen);

    const executeLambdaTask = new CustomState(this, 'ExecuteLambda', {
      stateJson: {
        Type: 'Task',
        Resource: 'arn:aws:states:::lambda:invoke',
        Parameters: {
          'FunctionName.$': '$.targetLambda'
        },
        Comment:
          'Task to execute lambda. This will set circuit status to OPEN if the execution fails for three times or the task times out',
        TimeoutSeconds: 12,
      }
    });
    executeLambdaTask.addRetry({
      backoffRate: 1.5,
      errors: [Errors.TASKS_FAILED, Errors.TIMEOUT],
      interval: Duration.seconds(2),
    });
    executeLambdaTask.addCatch(updateCircuitBreakerStatusTask, {
      errors: [Errors.TASKS_FAILED, Errors.TIMEOUT],
    });

    const chain = Chain.start(getCircuitBreakerStatusTask).next(new Choice(this, 'IsCircuitClosed', {
      comment: 'Is circuit closed?',
    }).when(Condition.booleanEquals('$.isClosed', false), circuitOpen)
      .when(Condition.booleanEquals('$.isClosed', true), executeLambdaTask.next(circuitClosed)));

    const stateMachine = new StateMachine(this, 'CircuitBreaker-StepFunction', {
      stateMachineName: 'CircuitBreaker-StepFunction',
      stateMachineType: StateMachineType.EXPRESS,
      logs: {
        destination: new LogGroup(this, 'CircuitBreakerLogGroup'),
        includeExecutionData: true,
        level: LogLevel.ALL,
      },
      tracingEnabled: true,
      definitionBody: DefinitionBody.fromChainable(chain),
    });
    getCircuitBreakerLambda.grantInvoke(stateMachine);
    updateCircuitBreakerLambda.grantInvoke(stateMachine);
    helloWorldLambda.grantInvoke(stateMachine);

    new CfnOutput(this, 'HelloWorldName', {
      value: helloWorldLambda.functionName
    });
  }

}
