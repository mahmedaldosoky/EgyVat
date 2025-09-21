using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace EgyVAT.Shared;

/// <summary>
/// Base class for Lambda functions to reduce code duplication
/// </summary>
public abstract class LambdaBase
{
    protected static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    protected static readonly Dictionary<string, string> CorsHeaders = new()
    {
        { "Access-Control-Allow-Origin", "*" },
        { "Access-Control-Allow-Headers", "Content-Type,X-Amz-Date,Authorization,X-Api-Key" },
        { "Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS" },
        { "Content-Type", "application/json" }
    };
    
    /// <summary>
    /// Handle CORS preflight requests
    /// </summary>
    protected APIGatewayProxyResponse HandleCorsOptions()
    {
        return new APIGatewayProxyResponse
        {
            StatusCode = 200,
            Headers = CorsHeaders,
            Body = string.Empty
        };
    }
    
    /// <summary>
    /// Create a standardized API response
    /// </summary>
    protected APIGatewayProxyResponse CreateResponse<T>(int statusCode, bool success, string message, T? data = default, List<string>? errors = null)
    {
        var response = new ApiResponse<T>
        {
            Success = success,
            Message = message,
            Data = data,
            Errors = errors ?? new List<string>(),
            Timestamp = DateTime.UtcNow
        };
        
        return new APIGatewayProxyResponse
        {
            StatusCode = statusCode,
            Headers = CorsHeaders,
            Body = JsonSerializer.Serialize(response, JsonOptions)
        };
    }
    
    /// <summary>
    /// Create an error response
    /// </summary>
    protected APIGatewayProxyResponse CreateErrorResponse(int statusCode, string message, List<string>? errors = null)
    {
        return CreateResponse<object>(statusCode, false, message, null, errors);
    }
    
    /// <summary>
    /// Parse request body to object
    /// </summary>
    protected T? ParseRequestBody<T>(string? body) where T : class
    {
        if (string.IsNullOrWhiteSpace(body)) return null;
        
        try
        {
            return JsonSerializer.Deserialize<T>(body, JsonOptions);
        }
        catch
        {
            return null;
        }
    }
    
    /// <summary>
    /// Log and handle exceptions consistently
    /// </summary>
    protected APIGatewayProxyResponse HandleException(Exception ex, ILambdaContext context)
    {
        context.Logger.LogError($"Error: {ex.Message}");
        context.Logger.LogError($"StackTrace: {ex.StackTrace}");
        
        // Don't expose internal errors in production
        var message = IsProduction() 
            ? "An error occurred processing your request" 
            : ex.Message;
        
        return CreateErrorResponse(500, message, new List<string> { "Internal server error" });
    }
    
    private bool IsProduction()
    {
        var env = Environment.GetEnvironmentVariable("ENVIRONMENT");
        return env?.ToLower() == "production" || env?.ToLower() == "prod";
    }
}
