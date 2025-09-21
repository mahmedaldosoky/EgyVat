@echo off
echo Deploying EgyVAT to AWS Lambda...

REM Build the solution first
echo Building solution...
dotnet build EgyVAT.sln --configuration Release
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b 1
)

REM Create deployment packages
echo Creating deployment packages...

REM Deploy InvoiceGenerator
echo Deploying InvoiceGenerator...
cd InvoiceGenerator
dotnet lambda deploy-function InvoiceGenerator --configuration Release --function-runtime dotnet8 --function-architecture x86_64 --function-role arn:aws:iam::ACCOUNT:role/lambda-execution-role
cd ..

REM Deploy InvoiceRetriever  
echo Deploying InvoiceRetriever...
cd InvoiceRetriever
dotnet lambda deploy-function InvoiceRetriever --configuration Release --function-runtime dotnet8 --function-architecture x86_64 --function-role arn:aws:iam::ACCOUNT:role/lambda-execution-role
cd ..

REM Deploy ReportGenerator
echo Deploying ReportGenerator...
cd ReportGenerator
dotnet lambda deploy-function ReportGenerator --configuration Release --function-runtime dotnet8 --function-architecture x86_64 --function-role arn:aws:iam::ACCOUNT:role/lambda-execution-role
cd ..

echo Deployment complete!
