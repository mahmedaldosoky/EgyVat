using System.Text.Json.Serialization;

namespace EgyVAT.Shared;

// ==================== Invoice Models ====================
public class EgyptianInvoice
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public string UUID { get; set; } = Guid.NewGuid().ToString();
    public DateTime IssueDateTime { get; set; } = DateTime.UtcNow;
    
    // Egyptian Tax Authority specific fields
    public string DocumentType { get; set; } = "I"; // I=Invoice, C=Credit, D=Debit
    public string DocumentTypeVersion { get; set; } = "1.0";
    public string Currency { get; set; } = "EGP";
    public decimal ExchangeRate { get; set; } = 1.0m;
    
    // Parties
    public SupplierInfo Supplier { get; set; } = new();
    public CustomerInfo Customer { get; set; } = new();
    
    // Lines and totals
    public List<InvoiceLine> Lines { get; set; } = new();
    
    [JsonIgnore]
    public decimal SubTotal => Lines.Sum(l => l.LineTotal);
    
    [JsonIgnore]
    public decimal TotalVatAmount => Lines.Sum(l => l.VatAmount);
    
    [JsonIgnore]
    public decimal TotalAmount => SubTotal + TotalVatAmount;
    
    // ETA Workflow states - Production Ready
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public string? ETASubmissionId { get; set; }
    public DateTime? ETASubmissionDate { get; set; }
    public string? ETAResponse { get; set; }
    public string? ETALongId { get; set; }  // ETA long ID after acceptance
    public string? ETAInternalId { get; set; }  // ETA internal ID
    public DateTime? ETAAcceptanceDate { get; set; }
    public List<string> ETARejectionReasons { get; set; } = new();
    
    // Metadata
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public List<ValidationError> ValidationErrors { get; set; } = new();
    public int SubmissionAttempts { get; set; } = 0;
    public DateTime? LastSubmissionAttempt { get; set; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InvoiceStatus
{
    Draft,           // Initial creation
    Validated,       // Passed local ETA validation rules
    Submitting,      // Being submitted to ETA
    Submitted,       // Sent to ETA, awaiting response
    Valid,           // Accepted by ETA and valid
    Invalid,         // Rejected by ETA with errors
    Cancelled,       // Cancelled after acceptance
    Rejected         // Final rejection after multiple attempts
}

public class SupplierInfo
{
    public string Name { get; set; } = string.Empty;
    public string TaxNumber { get; set; } = string.Empty;  // 9 digits
    public string Address { get; set; } = string.Empty;
    public string ActivityCode { get; set; } = string.Empty;  // ETA activity code
    public string? BranchId { get; set; } = "0";  // Default to main branch
}

public class CustomerInfo
{
    public string Name { get; set; } = string.Empty;
    public string? TaxNumber { get; set; }  // 9 digits for B2B
    public string? NationalId { get; set; }  // 14 digits for B2C
    public string? PassportNumber { get; set; }  // For foreign customers
    public string? Address { get; set; }
    public CustomerType Type { get; set; } = CustomerType.B2C;
}

public enum CustomerType
{
    B2B,  // Business (has tax number)
    B2C,  // Consumer (has national ID)
    F     // Foreign (has passport)
}

public class InvoiceLine
{
    public string Description { get; set; } = string.Empty;
    public string ItemCode { get; set; } = string.Empty;  // Internal code
    public string GS1Code { get; set; } = "10000000";  // ETA GS1/EGS code
    public string UnitType { get; set; } = "EA";  // EA=Each, KG=Kilogram, etc.
    
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountRate { get; set; } = 0;
    public decimal DiscountAmount { get; set; } = 0;
    
    [JsonIgnore]
    public decimal NetAmount => (Quantity * UnitPrice) - DiscountAmount;
    
    public decimal VatRate { get; set; } = 14;  // Egyptian VAT is 14%
    
    [JsonIgnore]
    public decimal VatAmount => NetAmount * (VatRate / 100);
    
    [JsonIgnore]
    public decimal LineTotal => NetAmount;
}

// ==================== Validation Models ====================
public class ValidationError
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Field { get; set; } = string.Empty;
    public ValidationSeverity Severity { get; set; } = ValidationSeverity.Error;
}

public enum ValidationSeverity{
    Warning,
    Error,
    Critical
}

// ==================== Request/Response Models ====================
public class InvoiceRequest
{
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerTaxNumber { get; set; }
    public string? CustomerNationalId { get; set; }
    public string? CustomerPassportNumber { get; set; }
    public string? CustomerAddress { get; set; }
    
    public string ItemDescription { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public string? GS1Code { get; set; }
    public string? UnitType { get; set; }
    
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountRate { get; set; } = 0;
}

// New format from React frontend
public class CreateInvoiceRequest
{
    public CustomerInput Customer { get; set; } = new();
    public string IssueDate { get; set; } = string.Empty;
    public List<LineItemInput> Lines { get; set; } = new();}

public class CustomerInput
{
    public string Name { get; set; } = string.Empty;
    public string TaxNumber { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
}

public class LineItemInput
{
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TaxRate { get; set; } = 0.14m;  // 14% as decimal
}

// ==================== API Response Models ====================
public class ApiResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public object? Data { get; set; }
    public List<string>? Errors { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<string> Errors { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

// ==================== ETA Response Models ====================
public class ETASubmissionResult
{
    public bool Success { get; set; }
    public string? ETAUuid { get; set; }
    public string? ETALongId { get; set; }    public string? ETAInternalId { get; set; }
    public string? ETAStatus { get; set; }  // Valid, Invalid, Submitted
    public string? ETAResponse { get; set; }
    public string? ErrorMessage { get; set; }
    public List<ETAValidationError>? ValidationErrors { get; set; }
}

public class ETAValidationError
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string PropertyPath { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
}

// ==================== Configuration ====================
public static class Config
{
    public static string TableName => Environment.GetEnvironmentVariable("TABLE_NAME") ?? "EgyVAT-Invoices";
    public static string SupplierName => Environment.GetEnvironmentVariable("SUPPLIER_NAME") ?? "Test Company Ltd";
    public static string SupplierTaxNumber => Environment.GetEnvironmentVariable("SUPPLIER_TAX_NUMBER") ?? "123456789";
    public static string SupplierAddress => Environment.GetEnvironmentVariable("SUPPLIER_ADDRESS") ?? "123 Business St, Cairo, Egypt";
    public static string SupplierActivityCode => Environment.GetEnvironmentVariable("SUPPLIER_ACTIVITY_CODE") ?? "4620";
    
    // ETA API Configuration
    public static string ETAApiUrl => Environment.GetEnvironmentVariable("ETA_API_URL") ?? "https://api.invoicing.eta.gov.eg";
    public static string ETAClientId => Environment.GetEnvironmentVariable("ETA_CLIENT_ID") ?? "";
    public static string ETAClientSecret => Environment.GetEnvironmentVariable("ETA_CLIENT_SECRET") ?? "";
}