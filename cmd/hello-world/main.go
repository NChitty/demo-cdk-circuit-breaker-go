package main

import (
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func Handler(event *events.LambdaFunctionURLRequest) (events.LambdaFunctionURLResponse, error) {
	fmt.Println(event)

	response := events.LambdaFunctionURLResponse{
		Body:       "Hello, world!",
		StatusCode: 200,
	}

	fmt.Println(response)
	return response, nil
}

func main() {
	lambda.Start(Handler)
}
