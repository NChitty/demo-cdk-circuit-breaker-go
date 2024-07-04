package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/NChitty/demo-cdk-circuit-breaker-go/pkg/circuit"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, event circuit.CircuitRequest) (circuit.CircuitResponse, error) {
	cfg, _ := config.LoadDefaultConfig(ctx)
	ddbClient := dynamodb.NewFromConfig(cfg)

	ddbTableName := os.Getenv("DDB_TABLE_NAME")
	fmt.Printf("DDB Table Name: %s\n", ddbTableName)

	ddbCircuitName := os.Getenv("DDB_CIRCUIT_NAME")
	fmt.Printf("DDB Circuit Name: %s\n", ddbCircuitName)

	now := time.Now().Unix()
	circuitAttributeValue, _ := attributevalue.Marshal(ddbCircuitName)
	currentTime, _ := attributevalue.Marshal(now)
	keyConditionExpression := "circuit = :partitionkey AND closesAt > :currentTime"

	request := &dynamodb.QueryInput{
		TableName: &ddbTableName,
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":currentTime":  currentTime,
			":partitionkey": circuitAttributeValue,
		},
		KeyConditionExpression: &keyConditionExpression,
	}
	jsonRequest, _ := json.Marshal(request)
	fmt.Printf("DDB Request: %s\n", jsonRequest)

	var circuitResponse circuit.CircuitResponse
	response, err := ddbClient.Query(context.TODO(), request)
	jsonResponse, _ := json.Marshal(response)
	fmt.Printf("DDB Response: %s\n", jsonResponse)
	fmt.Printf("DDB Error: %s\n", err)

	if err != nil || len(response.Items) > 0 {
		circuitResponse = circuit.CircuitResponse{IsClosed: false, TargetLambda: event.TargetLambda}
	} else {
		circuitResponse = circuit.CircuitResponse{IsClosed: true, TargetLambda: event.TargetLambda}
	}

	return circuitResponse, nil
}
