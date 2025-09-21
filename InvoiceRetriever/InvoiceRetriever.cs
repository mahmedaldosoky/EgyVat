using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using System.Text.Json;
using EgyVAT.Shared;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace EgyVAT.InvoiceRetriever;

public class Function : LambdaBase
{
    private readonly IAmazonDynamoDB _dynamoDbClient;
    private readonly Table _invoiceTable;
    
    public Function()
    {
        _dynamoDbClient = new AmazonDynamoDBClient();
        var tableName = Environment.GetEnvironmentVariable("TABLE_NAME") ?? "EgyVAT-Invoices";
        _invoiceTable = (Table)Table.LoadTable(_dynamoDbClient, tableName);
    }

    /// <summary>
    /// Retrieve invoices with various filtering options
    /// </summary>
    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            context.Logger.LogInformation($"Request: {request.HttpMethod} {request.Path}");
            
            // Handle CORS
            if (request.HttpMethod == "OPTIONS")
                return HandleCorsOptions();
            
            // Only support GET
            if (request.HttpMethod.ToUpper() != "GET")
                return CreateErrorResponse(405, "Method not allowed");
            
            // Route based on path
            if (request.PathParameters?.ContainsKey("invoiceNumber") == true)
            {
                var invoiceNumber = request.PathParameters["invoiceNumber"];
                return await GetInvoiceByNumber(invoiceNumber, context);
            }
            
            // Default: Get all invoices (simplified)
            return await GetAllInvoices(context);
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error in InvoiceRetriever: {ex.Message}");
            context.Logger.LogError($"Stack trace: {ex.StackTrace}");
            return HandleException(ex, context);
        }
    }
    
    private async Task<APIGatewayProxyResponse> GetInvoiceByNumber(string invoiceNumber, ILambdaContext context)
    {
        try
        {
            context.Logger.LogInformation($"Getting invoice: {invoiceNumber}");
            
            // Get specific invoice using GetItem (more efficient than Query)
            var document = await _invoiceTable.GetItemAsync(invoiceNumber, "INVOICE");
            
            if (document == null)
            {
                context.Logger.LogWarning($"Invoice not found: {invoiceNumber}");
                return CreateErrorResponse(404, $"Invoice {invoiceNumber} not found");
            }
            
            var invoiceJson = document.ToJson();
            var invoice = JsonSerializer.Deserialize<EgyptianInvoice>(invoiceJson, JsonOptions);
            
            context.Logger.LogInformation($"Successfully retrieved invoice: {invoiceNumber}");
            return CreateResponse(200, true, "Invoice retrieved successfully", invoice);
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error getting invoice {invoiceNumber}: {ex.Message}");
            throw;
        }
    }
    
    private async Task<APIGatewayProxyResponse> GetAllInvoices(ILambdaContext context)
    {
        try
        {
            context.Logger.LogInformation("Getting all invoices");
            
            var invoices = new List<EgyptianInvoice>();
            
            // Use scan to get all items (simplified approach)
            var scanFilter = new ScanFilter();
            scanFilter.AddCondition("SK", ScanOperator.Equal, "INVOICE");
            
            var scanConfig = new ScanOperationConfig
            {
                Filter = scanFilter,
                Limit = 100,  // Limit to prevent timeout
                ConsistentRead = false
            };
            
            context.Logger.LogInformation("Starting DynamoDB scan");
            var search = _invoiceTable.Scan(scanConfig);
            
            List<Document> documents;
            do
            {
                documents = await search.GetNextSetAsync();
                context.Logger.LogInformation($"Retrieved {documents.Count} documents");
                
                foreach (var document in documents)
                {
                    try
                    {
                        var invoiceJson = document.ToJson();
                        var invoice = JsonSerializer.Deserialize<EgyptianInvoice>(invoiceJson, JsonOptions);
                        if (invoice != null)
                        {
                            invoices.Add(invoice);
                        }
                    }
                    catch (Exception ex)
                    {
                        context.Logger.LogWarning($"Failed to deserialize invoice: {ex.Message}");
                    }
                }
                
                // Only get first batch to prevent timeout
                break;
                
            } while (!search.IsDone && invoices.Count < 100);
            
            // Sort by creation date
            invoices = invoices.OrderByDescending(i => i.CreatedAt).ToList();
            
            context.Logger.LogInformation($"Successfully retrieved {invoices.Count} invoices");
            
            // Return wrapped response for frontend compatibility
            var response = new
            {
                invoices = invoices,
                total = invoices.Count
            };
            
            return CreateResponse(200, true, $"Retrieved {invoices.Count} invoices", response);
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error in GetAllInvoices: {ex.Message}");
            context.Logger.LogError($"Stack trace: {ex.StackTrace}");
            
            // Return empty list on error to prevent frontend crash
            var emptyResponse = new
            {
                invoices = new List<EgyptianInvoice>(),
                total = 0
            };
            
            return CreateResponse(200, true, "No invoices found", emptyResponse);
        }
    }
}