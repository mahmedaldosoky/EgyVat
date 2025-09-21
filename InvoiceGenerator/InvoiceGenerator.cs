using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using System.Text.Json;
using EgyVAT.Shared;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace EgyVAT.InvoiceGenerator;

public class Function : LambdaBase
{
    private readonly Table _invoiceTable;
    
    public Function()
    {
        var dynamoDb = new AmazonDynamoDBClient();
        var tableName = Environment.GetEnvironmentVariable("TABLE_NAME") ?? "EgyVAT-Invoices";
        _invoiceTable = (Table)Table.LoadTable(dynamoDb, tableName);  // Add explicit cast
    }

    /// <summary>
    /// Generate and validate Egyptian invoices
    /// </summary>
    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            // Handle CORS
            if (request.HttpMethod == "OPTIONS")
                return HandleCorsOptions();
            
            // Route based on HTTP method
            return request.HttpMethod.ToUpper() switch
            {
                "POST" => await CreateInvoice(request, context),
                "PUT" => await UpdateInvoiceStatus(request, context),
                _ => CreateErrorResponse(405, "Method not allowed")
            };
        }
        catch (Exception ex)
        {
            return HandleException(ex, context);
        }
    }
    
    private async Task<APIGatewayProxyResponse> CreateInvoice(APIGatewayProxyRequest request, ILambdaContext context)
    {
        // Parse request - try new format first, then fall back to legacy
        var newFormatInput = ParseRequestBody<CreateInvoiceRequest>(request.Body);
        
        if (newFormatInput != null)
        {
            // Handle new frontend format
            return await CreateInvoiceNewFormat(newFormatInput, context);
        }
        
        // Fall back to legacy format
        var legacyInput = ParseRequestBody<InvoiceRequest>(request.Body);
        if (legacyInput == null)
            return CreateErrorResponse(400, "Invalid request body");
        
        return await CreateInvoiceLegacyFormat(legacyInput, context);
    }
    
    private async Task<APIGatewayProxyResponse> CreateInvoiceNewFormat(CreateInvoiceRequest input, ILambdaContext context)
    {
        // Quick validation
        var validationErrors = ValidateNewFormatRequest(input);
        if (validationErrors.Any())
            return CreateErrorResponse(400, "Validation failed", validationErrors);
        
        // Create invoice
        var invoice = BuildInvoiceFromNewFormat(input);
        
        // Apply ETA validation rules
        invoice.ValidationErrors = EgyptianTaxValidator.ValidateInvoice(invoice);
        invoice.Status = invoice.ValidationErrors.Any() ? InvoiceStatus.Draft : InvoiceStatus.Validated;
        
        // Save to DynamoDB
        await SaveInvoice(invoice);
        
        // Log
        context.Logger.LogInformation($"Invoice {invoice.Status}: {invoice.InvoiceNumber}");
        
        // Return response
        var message = invoice.Status == InvoiceStatus.Validated
            ? "Invoice created and validated successfully"
            : $"Invoice created with {invoice.ValidationErrors.Count} validation errors";
        
        return CreateResponse(200, true, message, invoice);
    }
    
    private async Task<APIGatewayProxyResponse> CreateInvoiceLegacyFormat(InvoiceRequest input, ILambdaContext context)
    {
        // Quick validation
        var validationErrors = ValidateRequest(input);
        if (validationErrors.Any())
            return CreateErrorResponse(400, "Validation failed", validationErrors);
        
        // Create invoice
        var invoice = BuildInvoice(input);
        
        // Apply ETA validation rules
        invoice.ValidationErrors = EgyptianTaxValidator.ValidateInvoice(invoice);
        invoice.Status = invoice.ValidationErrors.Any() ? InvoiceStatus.Draft : InvoiceStatus.Validated;
        
        // Save to DynamoDB
        await SaveInvoice(invoice);
        
        // Log
        context.Logger.LogInformation($"Invoice {invoice.Status}: {invoice.InvoiceNumber}");
        
        // Return response
        var message = invoice.Status == InvoiceStatus.Validated
            ? "Invoice created and validated successfully"
            : $"Invoice created with {invoice.ValidationErrors.Count} validation errors";
        
        return CreateResponse(200, true, message, invoice);
    }
    
    private async Task<APIGatewayProxyResponse> UpdateInvoiceStatus(APIGatewayProxyRequest request, ILambdaContext context)
    {
        // Get invoice number from path
        string invoiceNumber = string.Empty;
        if (!request.PathParameters?.TryGetValue("invoiceNumber", out invoiceNumber) ?? true)
            return CreateErrorResponse(400, "Invoice number required");

        // Parse action from body
        var body = ParseRequestBody<Dictionary<string, string>>(request.Body);
        var action = body?.GetValueOrDefault("action");
        
        if (string.IsNullOrEmpty(action))
            return CreateErrorResponse(400, "Action required (validate, submit, resubmit, cancel)");
        
        // Load invoice
        var document = await _invoiceTable.GetItemAsync(invoiceNumber, "INVOICE");
        if (document == null)
            return CreateErrorResponse(404, "Invoice not found");
        
        var invoice = JsonSerializer.Deserialize<EgyptianInvoice>(document.ToJson(), JsonOptions)!;
        
        // Handle actions based on current status and ETA workflow
        var (success, message) = action.ToLower() switch
        {
            "validate" => await ValidateInvoiceAsync(invoice, context),
            "submit" => await SubmitToETAAsync(invoice, context),
            "resubmit" => await ResubmitToETAAsync(invoice, context),
            "check_status" => await CheckETAStatusAsync(invoice, context),
            "cancel" => await CancelInvoiceAsync(invoice, context),
            _ => (false, "Invalid action")
        };
        
        if (!success)
            return CreateErrorResponse(400, message, invoice.ValidationErrors?.Select(e => e.Message).ToList());
        
        // Save updated invoice
        invoice.UpdatedAt = DateTime.UtcNow;
        await SaveInvoice(invoice);
        
        context.Logger.LogInformation($"Invoice {invoice.InvoiceNumber} status: {invoice.Status}");
        
        return CreateResponse(200, true, message, invoice);
    }
    
    private List<string> ValidateNewFormatRequest(CreateInvoiceRequest request)
    {
        var errors = new List<string>();
        
        // Customer validation
        if (string.IsNullOrWhiteSpace(request.Customer.Name))
            errors.Add("Customer name is required");
            
        if (string.IsNullOrWhiteSpace(request.Customer.Address))
            errors.Add("Customer address is required");
            
        if (string.IsNullOrWhiteSpace(request.Customer.TaxNumber))
            errors.Add("Customer tax number is required");
        else if (!EgyptianTaxValidator.IsValidTaxNumber(request.Customer.TaxNumber))
            errors.Add("Customer tax number must be 9 digits");
        
        // Issue date validation
        if (string.IsNullOrWhiteSpace(request.IssueDate))
            errors.Add("Issue date is required");
        else if (!DateTime.TryParse(request.IssueDate, out _))
            errors.Add("Issue date must be valid date");
        
        // Lines validation
        if (!request.Lines.Any())
            errors.Add("At least one line item is required");
        
        for (int i = 0; i < request.Lines.Count; i++)
        {
            var line = request.Lines[i];
            
            if (string.IsNullOrWhiteSpace(line.Description))
                errors.Add($"Line {i + 1}: Description is required");
                
            if (line.Quantity <= 0)
                errors.Add($"Line {i + 1}: Quantity must be positive");
                
            if (line.UnitPrice <= 0)
                errors.Add($"Line {i + 1}: Unit price must be positive");
                
            if (line.TaxRate < 0 || line.TaxRate > 1)
                errors.Add($"Line {i + 1}: Tax rate must be between 0 and 1 (e.g., 0.14 for 14%)");
        }
        
        return errors;
    }
    
    private List<string> ValidateRequest(InvoiceRequest request)
    {
        var errors = new List<string>();
        
        // Basic validation
        if (string.IsNullOrWhiteSpace(request.CustomerName))
            errors.Add("Customer name is required");
        
        if (request.Quantity <= 0)
            errors.Add("Quantity must be positive");
        
        if (request.UnitPrice <= 0)
            errors.Add("Unit price must be positive");
        
        if (string.IsNullOrWhiteSpace(request.ItemDescription))
            errors.Add("Item description is required");
        
        // Customer identification validation
        var hasValidId = EgyptianTaxValidator.IsValidTaxNumber(request.CustomerTaxNumber) ||
                        EgyptianTaxValidator.IsValidNationalId(request.CustomerNationalId) ||
                        EgyptianTaxValidator.IsValidPassportNumber(request.CustomerPassportNumber);
        
        if (!hasValidId)
            errors.Add("Customer must have valid Tax Number (9 digits), National ID (14 digits), or Passport");
        
        return errors;
    }
    
    private EgyptianInvoice BuildInvoiceFromNewFormat(CreateInvoiceRequest request)
    {
        // Parse issue date
        var issueDate = DateTime.TryParse(request.IssueDate, out var parsedDate) ? parsedDate : DateTime.UtcNow;
        
        // Create invoice
        var invoice = new EgyptianInvoice
        {
            InvoiceNumber = EgyptianTaxValidator.GenerateInvoiceNumber(),
            IssueDateTime = issueDate,
            
            Supplier = new SupplierInfo
            {
                Name = Environment.GetEnvironmentVariable("SUPPLIER_NAME") ?? "Test Company Ltd",
                TaxNumber = Environment.GetEnvironmentVariable("SUPPLIER_TAX_NUMBER") ?? "123456789",
                Address = Environment.GetEnvironmentVariable("SUPPLIER_ADDRESS") ?? "123 Business St, Cairo, Egypt",
                ActivityCode = Environment.GetEnvironmentVariable("SUPPLIER_ACTIVITY_CODE") ?? "4620"
            },
            
            Customer = new CustomerInfo
            {
                Name = request.Customer.Name,
                TaxNumber = request.Customer.TaxNumber,
                Address = request.Customer.Address,
                Type = CustomerType.B2B // Tax number provided = B2B
            },
            
            Lines = request.Lines.Select((line, index) => new InvoiceLine
            {
                Description = line.Description,
                ItemCode = $"ITEM{index + 1:000}",
                GS1Code = EgyptianTaxValidator.MapToGS1Code(line.Description),
                UnitType = "EA",
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                DiscountRate = 0,
                DiscountAmount = 0,
                VatRate = line.TaxRate * 100 // Convert 0.14 to 14
            }).ToList()
        };
        
        return invoice;
    }
    
    private EgyptianInvoice BuildInvoice(InvoiceRequest request)
    {
        // Determine customer type
        var customerType = EgyptianTaxValidator.DetermineCustomerType(
            request.CustomerTaxNumber,
            request.CustomerNationalId,
            request.CustomerPassportNumber);
        
        // Create invoice
        var invoice = new EgyptianInvoice
        {
            InvoiceNumber = EgyptianTaxValidator.GenerateInvoiceNumber(),
            
            Supplier = new SupplierInfo
            {
                Name = Environment.GetEnvironmentVariable("SUPPLIER_NAME") ?? "Test Company Ltd",
                TaxNumber = Environment.GetEnvironmentVariable("SUPPLIER_TAX_NUMBER") ?? "123456789",
                Address = Environment.GetEnvironmentVariable("SUPPLIER_ADDRESS") ?? "123 Business St, Cairo, Egypt",
                ActivityCode = Environment.GetEnvironmentVariable("SUPPLIER_ACTIVITY_CODE") ?? "4620"
            },
            
            Customer = new CustomerInfo
            {
                Name = request.CustomerName,
                TaxNumber = request.CustomerTaxNumber,
                NationalId = request.CustomerNationalId,
                PassportNumber = request.CustomerPassportNumber,
                Address = request.CustomerAddress,
                Type = customerType
            },
            
            Lines = new List<InvoiceLine>
            {
                new InvoiceLine
                {
                    Description = request.ItemDescription,
                    ItemCode = request.ItemCode ?? "ITEM001",
                    GS1Code = request.GS1Code ?? EgyptianTaxValidator.MapToGS1Code(request.ItemDescription),
                    UnitType = request.UnitType ?? "EA",
                    Quantity = request.Quantity,
                    UnitPrice = request.UnitPrice,
                    DiscountRate = request.DiscountRate,
                    DiscountAmount = (request.Quantity * request.UnitPrice) * (request.DiscountRate / 100),
                    VatRate = 14 // Standard Egyptian VAT
                }
            }
        };
        
        return invoice;
    }
    
    private async Task<(bool success, string message)> ValidateInvoiceAsync(EgyptianInvoice invoice, ILambdaContext context)
    {
        // Only draft invoices can be validated
        if (invoice.Status != InvoiceStatus.Draft && invoice.Status != InvoiceStatus.Invalid)
            return (false, $"Cannot validate invoice in {invoice.Status} status");
        
        // Run Egyptian tax validation
        invoice.ValidationErrors = EgyptianTaxValidator.ValidateInvoice(invoice);
        
        if (invoice.ValidationErrors.Any())
        {
            invoice.Status = InvoiceStatus.Draft;
            var criticalErrors = invoice.ValidationErrors.Where(e => e.Severity == ValidationSeverity.Critical).Count();
            var errors = invoice.ValidationErrors.Where(e => e.Severity == ValidationSeverity.Error).Count();
            return (false, $"Validation failed: {criticalErrors} critical, {errors} errors");
        }
        
        // Validation passed
        invoice.Status = InvoiceStatus.Validated;
        return (true, "Invoice validated successfully - ready for ETA submission");
    }
    
    private async Task<(bool success, string message)> SubmitToETAAsync(EgyptianInvoice invoice, ILambdaContext context)
    {
        // Check current status
        if (invoice.Status == InvoiceStatus.Valid)
            return (false, "Invoice already accepted by ETA");
        
        if (invoice.Status != InvoiceStatus.Validated && invoice.Status != InvoiceStatus.Invalid)
            return (false, $"Invoice must be validated first (current: {invoice.Status})");
        
        // Track submission attempts
        invoice.SubmissionAttempts++;
        invoice.LastSubmissionAttempt = DateTime.UtcNow;
        
        if (invoice.SubmissionAttempts > 3)
        {
            invoice.Status = InvoiceStatus.Rejected;
            return (false, "Maximum submission attempts exceeded");
        }
        
        try
        {
            invoice.Status = InvoiceStatus.Submitting;
            
            // Check if running in DEMO mode
            var environment = Environment.GetEnvironmentVariable("ENVIRONMENT");
            var clientId = Environment.GetEnvironmentVariable("ETA_CLIENT_ID") ?? "";
            var clientSecret = Environment.GetEnvironmentVariable("ETA_CLIENT_SECRET") ?? "";
            
            if (environment == "demo" || clientId == "DEMO_MODE" || string.IsNullOrEmpty(clientId))
            {
                // DEMO MODE: Simulate successful ETA submission
                context.Logger.LogInformation($"DEMO MODE: Simulating ETA submission for {invoice.InvoiceNumber}");
                
                // Simulate processing delay
                await Task.Delay(500);
                
                // Generate mock ETA IDs
                invoice.ETASubmissionId = Guid.NewGuid().ToString();
                invoice.ETASubmissionDate = DateTime.UtcNow;
                invoice.ETALongId = $"ETA{DateTime.UtcNow:yyyyMMdd}{new Random().Next(100000, 999999)}";
                invoice.ETAInternalId = $"INT{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
                invoice.ETAResponse = "DEMO_MODE_RESPONSE";
                
                // Simulate 90% success rate in demo mode
                if (new Random().Next(1, 11) <= 9)
                {
                    invoice.Status = InvoiceStatus.Valid;
                    invoice.ETAAcceptanceDate = DateTime.UtcNow;
                    invoice.ETARejectionReasons.Clear();
                    return (true, $"[DEMO MODE] Invoice accepted by ETA. Long ID: {invoice.ETALongId}");
                }
                else
                {
                    invoice.Status = InvoiceStatus.Invalid;
                    invoice.ETARejectionReasons = new List<string> 
                    { 
                        "[DEMO] Sample validation error for testing"
                    };
                    return (false, "[DEMO MODE] Invoice rejected by ETA with sample errors");
                }
            }
            
            // PRODUCTION MODE: Real ETA submission
            if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            {
                invoice.Status = InvoiceStatus.Invalid;
                invoice.ETARejectionReasons.Add("ETA API credentials not configured. Please configure ETA_CLIENT_ID and ETA_CLIENT_SECRET environment variables.");
                return (false, "ETA submission failed: API credentials not configured");
            }
            
            // Initialize ETA API service
            var etaService = new ETAApiService(
                Environment.GetEnvironmentVariable("ETA_API_URL") ?? "https://api.invoicing.eta.gov.eg",
                Environment.GetEnvironmentVariable("ETA_CLIENT_ID") ?? "",
                Environment.GetEnvironmentVariable("ETA_CLIENT_SECRET") ?? "");
            
            // Submit to ETA
            context.Logger.LogInformation($"Submitting invoice {invoice.InvoiceNumber} to ETA (attempt {invoice.SubmissionAttempts})");
            var result = await etaService.SubmitInvoiceAsync(invoice);
            
            if (result.Success)
            {
                invoice.ETASubmissionId = result.ETAUuid;
                invoice.ETASubmissionDate = DateTime.UtcNow;
                invoice.ETAResponse = result.ETAResponse;
                invoice.ETALongId = result.ETALongId;
                invoice.ETAInternalId = result.ETAInternalId;
                
                // Handle ETA status
                switch (result.ETAStatus?.ToLower())
                {
                    case "valid":
                        invoice.Status = InvoiceStatus.Valid;
                        invoice.ETAAcceptanceDate = DateTime.UtcNow;
                        invoice.ETARejectionReasons.Clear();
                        return (true, $"Invoice accepted by ETA. Long ID: {result.ETALongId}");
                        
                    case "invalid":
                        invoice.Status = InvoiceStatus.Invalid;
                        invoice.ETARejectionReasons = result.ValidationErrors?.Select(e => $"{e.Code}: {e.Message}").ToList() ?? new();
                        return (false, $"Invoice rejected by ETA with {invoice.ETARejectionReasons.Count} errors");
                        
                    default:
                        invoice.Status = InvoiceStatus.Submitted;
                        return (true, "Invoice submitted to ETA - awaiting validation");
                }
            }
            else
            {
                invoice.Status = InvoiceStatus.Invalid;
                invoice.ETARejectionReasons.Add(result.ErrorMessage ?? "Unknown error");
                context.Logger.LogError($"ETA submission failed: {result.ErrorMessage}");
                return (false, $"ETA submission failed: {result.ErrorMessage}");
            }
        }
        catch (Exception ex)
        {
            invoice.Status = InvoiceStatus.Invalid;
            invoice.ETARejectionReasons.Add($"System error: {ex.Message}");
            context.Logger.LogError($"Error submitting invoice {invoice.InvoiceNumber} to ETA: {ex}");
            return (false, $"System error: {ex.Message}");
        }
    }
    
    private async Task<(bool success, string message)> ResubmitToETAAsync(EgyptianInvoice invoice, ILambdaContext context)
    {
        // Only invalid invoices can be resubmitted
        if (invoice.Status != InvoiceStatus.Invalid)
            return (false, $"Only invalid invoices can be resubmitted (current: {invoice.Status})");
        
        // Clear previous rejection reasons
        invoice.ETARejectionReasons.Clear();
        invoice.ValidationErrors.Clear();
        
        // Revalidate before resubmission
        invoice.ValidationErrors = EgyptianTaxValidator.ValidateInvoice(invoice);
        if (invoice.ValidationErrors.Any())
        {
            invoice.Status = InvoiceStatus.Draft;
            return (false, "Revalidation failed - fix errors before resubmitting");
        }
        
        invoice.Status = InvoiceStatus.Validated;
        
        // Submit again
        return await SubmitToETAAsync(invoice, context);
    }
    
    private async Task<(bool success, string message)> CheckETAStatusAsync(EgyptianInvoice invoice, ILambdaContext context)
    {
        // Only check status for submitted invoices
        if (invoice.Status != InvoiceStatus.Submitted || string.IsNullOrEmpty(invoice.ETASubmissionId))
            return (false, "Can only check status for submitted invoices");
        
        try
        {
            var etaService = new ETAApiService(
                Environment.GetEnvironmentVariable("ETA_API_URL") ?? "https://api.invoicing.eta.gov.eg",
                Environment.GetEnvironmentVariable("ETA_CLIENT_ID") ?? "",
                Environment.GetEnvironmentVariable("ETA_CLIENT_SECRET") ?? "");
            
            // Query ETA for current status
            context.Logger.LogInformation($"Checking ETA status for {invoice.InvoiceNumber}");
            var result = await etaService.GetInvoiceStatusAsync(invoice.ETASubmissionId);
            
            if (result.Success)
            {
                switch (result.ETAStatus?.ToLower())
                {
                    case "valid":
                        invoice.Status = InvoiceStatus.Valid;
                        invoice.ETAAcceptanceDate = DateTime.UtcNow;
                        invoice.ETALongId = result.ETALongId;
                        return (true, $"Invoice accepted by ETA. Long ID: {result.ETALongId}");
                        
                    case "invalid":
                        invoice.Status = InvoiceStatus.Invalid;
                        invoice.ETARejectionReasons = result.ValidationErrors?.Select(e => $"{e.Code}: {e.Message}").ToList() ?? new();
                        return (true, $"Invoice rejected by ETA with {invoice.ETARejectionReasons.Count} errors");
                        
                    default:
                        return (true, $"Invoice still being processed by ETA (status: {result.ETAStatus})");
                }
            }
            
            return (false, result.ErrorMessage ?? "Failed to check status");
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error checking ETA status: {ex}");
            return (false, $"Error checking status: {ex.Message}");
        }
    }
    
    private async Task<(bool success, string message)> CancelInvoiceAsync(EgyptianInvoice invoice, ILambdaContext context)
    {
        // Different cancellation rules based on status
        switch (invoice.Status)
        {
            case InvoiceStatus.Draft:
            case InvoiceStatus.Validated:
            case InvoiceStatus.Invalid:
                invoice.Status = InvoiceStatus.Cancelled;
                return (true, "Invoice cancelled successfully");
                
            case InvoiceStatus.Valid:
                // Need to submit cancellation request to ETA
                try
                {
                    var etaService = new ETAApiService(
                        Environment.GetEnvironmentVariable("ETA_API_URL") ?? "https://api.invoicing.eta.gov.eg",
                        Environment.GetEnvironmentVariable("ETA_CLIENT_ID") ?? "",
                        Environment.GetEnvironmentVariable("ETA_CLIENT_SECRET") ?? "");
                    var result = await etaService.CancelInvoiceAsync(invoice.ETALongId!);
                    
                    if (result.Success)
                    {
                        invoice.Status = InvoiceStatus.Cancelled;
                        return (true, "Invoice cancelled with ETA successfully");
                    }
                    return (false, $"Failed to cancel with ETA: {result.ErrorMessage}");
                }
                catch (Exception ex)
                {
                    context.Logger.LogError($"Error cancelling invoice with ETA: {ex}");
                    return (false, $"Error cancelling with ETA: {ex.Message}");
                }
                
            default:
                return (false, $"Cannot cancel invoice in {invoice.Status} status");
        }
    }
    
    private async Task SaveInvoice(EgyptianInvoice invoice)
    {
        var json = JsonSerializer.Serialize(invoice, JsonOptions);
        var document = Document.FromJson(json);
        
        // Add keys for querying
        document["PK"] = invoice.InvoiceNumber;  // Partition key
        document["SK"] = "INVOICE";  // Sort key (for future extensions)
        
        // Add GSI keys
        if (!string.IsNullOrWhiteSpace(invoice.Customer.TaxNumber))
        {
            document["GSI1PK"] = $"CUSTOMER#{invoice.Customer.TaxNumber}";
            document["GSI1SK"] = $"INVOICE#{invoice.InvoiceNumber}";
        }
        
        document["GSI2PK"] = $"STATUS#{invoice.Status}";
        document["GSI2SK"] = $"DATE#{invoice.CreatedAt:yyyy-MM-dd}#{invoice.InvoiceNumber}";
        
        await _invoiceTable.PutItemAsync(document);
    }
}
