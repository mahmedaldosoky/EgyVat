@echo off
echo Deploying EgyVAT to AWS Lambda using AWS CLI...

REM Set variables (replace these with your actual values)
set AWS_REGION=us-east-1
set LAMBDA_ROLE=arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role

REM Build the solution
echo Building solution...
dotnet build EgyVAT.sln --configuration Release
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b 1
)

REM Function to deploy each Lambda
call :deploy_function InvoiceGenerator
call :deploy_function InvoiceRetriever  
call :deploy_function ReportGenerator

echo All deployments complete!
goto :eof

:deploy_function
set FUNCTION_NAME=%1
echo.
echo Deploying %FUNCTION_NAME%...

REM Create deployment package
cd %FUNCTION_NAME%
dotnet publish --configuration Release --runtime linux-x64 --self-contained false --output bin\Release\net8.0\publish
if %ERRORLEVEL% NEQ 0 (
    echo Publish failed for %FUNCTION_NAME%!
    cd ..
    exit /b 1
)

REM Create zip file
powershell -Command "Compress-Archive -Path 'bin\Release\net8.0\publish\*' -DestinationPath '%FUNCTION_NAME%.zip' -Force"

REM Deploy to AWS Lambda
aws lambda update-function-code --function-name %FUNCTION_NAME% --zip-file fileb://%FUNCTION_NAME%.zip --region %AWS_REGION%
if %ERRORLEVEL% NEQ 0 (
    echo Creating new function %FUNCTION_NAME%...
    aws lambda create-function ^
        --function-name %FUNCTION_NAME% ^
        --zip-file fileb://%FUNCTION_NAME%.zip ^
        --handler %FUNCTION_NAME%::%FUNCTION_NAME%.Function::FunctionHandler ^
        --runtime dotnet8 ^
        --role %LAMBDA_ROLE% ^
        --region %AWS_REGION%
)

REM Clean up
del %FUNCTION_NAME%.zip
cd ..
echo %FUNCTION_NAME% deployed successfully!
goto :eof
