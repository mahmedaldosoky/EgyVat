#!/bin/bash
# Deploy EgyVAT to AWS Lambda

set -e

echo "Deploying EgyVAT to AWS Lambda..."

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
LAMBDA_ROLE=${LAMBDA_ROLE:-arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role}

# Build solution
echo "Building solution..."
dotnet build EgyVAT.sln --configuration Release

# Deploy function
deploy_function() {
    local FUNCTION_NAME=$1
    echo ""
    echo "Deploying $FUNCTION_NAME..."
    
    cd $FUNCTION_NAME
    
    # Publish
    dotnet publish --configuration Release --runtime linux-x64 --self-contained false --output bin/Release/net8.0/publish
    
    # Create zip
    cd bin/Release/net8.0/publish
    zip -r ../../../../../../$FUNCTION_NAME.zip .
    cd ../../../../..
    
    # Deploy to AWS
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://$FUNCTION_NAME.zip \
        --region $AWS_REGION || \
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://$FUNCTION_NAME.zip \
        --handler $FUNCTION_NAME::$FUNCTION_NAME.Function::FunctionHandler \
        --runtime dotnet8 \
        --role $LAMBDA_ROLE \
        --region $AWS_REGION
    
    # Cleanup
    rm $FUNCTION_NAME.zip
    cd ..
    echo "$FUNCTION_NAME deployed successfully!"
}

# Deploy all functions
deploy_function "InvoiceGenerator"
deploy_function "InvoiceRetriever"
deploy_function "ReportGenerator"

echo "All deployments complete!"
