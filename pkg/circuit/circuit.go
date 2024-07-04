package circuit

type CircuitRequest struct {
	IsClosed     bool   `json:"isClosed"`
	TargetLambda string `json:"targetLambda"`
}

type Circuit struct {
	Circuit  string `json:"circuit" dynamodbav:"circuit"`
	ClosesAt int64  `json:"closesAt" dynamodbav:"closesAt"`
}

type CircuitResponse struct {
	IsClosed     bool   `json:"isClosed"`
	TargetLambda string `json:"targetLambda"`
}
