package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/NChitty/demo-cdk-circuit-breaker-go/pkg/circuit"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, event circuit.CircuitRequest) (circuit.Circuit, error) {
	cfg, _ := config.LoadDefaultConfig(ctx)
	ddbClient := dynamodb.NewFromConfig(cfg)

	ddbTableName := os.Getenv("DDB_TABLE_NAME")
	fmt.Printf("DDB Table Name: %s", ddbTableName)

	ddbCircuitName := os.Getenv("DDB_CIRCUIT_NAME")
	fmt.Printf("DDB Circuit Name: %s", ddbCircuitName)

	timeToLive, _ := time.ParseDuration(os.Getenv("DDB_TIME_TO_LIVE_DURATION"))
	fmt.Printf("DDB Time To Live Duration: %s", timeToLive)

	closesAt := time.Now().Add(timeToLive).Unix()
	circuit := circuit.Circuit{
		Circuit:  ddbCircuitName,
		ClosesAt: closesAt,
	}

	ddbItem, _ := attributevalue.MarshalMap(circuit)
	request := dynamodb.PutItemInput{
		TableName: &ddbTableName,
		Item:      ddbItem,
	}
	_, error := ddbClient.PutItem(context.TODO(), &request)

	if error != nil {
		fmt.Printf("Error: %s\n", error)
		return circuit, error
	}

	return circuit, nil
}
