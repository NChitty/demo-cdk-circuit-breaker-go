import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class PersistenceLayer extends Stack {
  public readonly dynamoDbTable: TableV2;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.dynamoDbTable = new TableV2(this, 'CircuitBreakerTable', {
        partitionKey: { name: 'circuit', type: AttributeType.STRING },
        removalPolicy: RemovalPolicy.DESTROY,
        sortKey: { name: 'closesAt', type: AttributeType.NUMBER },
        tableName: 'CircuitBreakers',
        timeToLiveAttribute: 'closesAt',
    });
  }
}
