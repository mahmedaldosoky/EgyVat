using System.Text;
using System.Text.Json;
using System.Net.Http;

namespace EgyVAT.Shared;

/// <summary>
/// Service for interacting with Egyptian Tax Authority API
/// </summary>
public class ETAApiService
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private readonly string _clientId;
    private readonly string _clientSecret;
    
    public ETAApiService(string baseUrl, string clientId, string clientSecret)
    {
        _baseUrl = baseUrl;
        _clientId = clientId;
        _clientSecret = clientSecret;
        
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(_baseUrl)
        };
    }
    
    /// <summary>
    /// Submit invoice to Egyptian Tax Authority
    /// </summary>
    public async Task<ETASubmissionResult> SubmitInvoiceAsync(EgyptianInvoice invoice)
    {
        try
        {
            // 1. Get access token
            var token = await GetAccessTokenAsync();
            if (string.IsNullOrEmpty(token))
            {
                return new ETASubmissionResult
                {
                    Success = false,
                    ErrorMessage = "Failed to authenticate with ETA"
                };
            }
            
            // 2. Convert invoice to ETA format
            var etaInvoice = ConvertToETAFormat(invoice);
            
            // 3. Submit to ETA
            _httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            
            var json = JsonSerializer.Serialize(etaInvoice, new JsonSerializerOptions 
            { 
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
            });
            
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("/documentsubmissions", content);
            
            if (response.IsSuccessStatusCode)
            {
                var responseJson = await response.Content.ReadAsStringAsync();
                var etaResponse = JsonSerializer.Deserialize<ETAResponse>(responseJson, new JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
                });
                
                // Parse response for status
                var status = etaResponse?.AcceptanceStatus ?? "Submitted";
                
                return new ETASubmissionResult
                {
                    Success = true,
                    ETAUuid = etaResponse?.SubmissionUuid,
                    ETAStatus = status == "Accepted" ? "Valid" : status,
                    ETALongId = GenerateMockETALongId(),
                    ETAInternalId = GenerateMockETAInternalId(),
                    ETAResponse = responseJson
                };
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                return new ETASubmissionResult
                {
                    Success = false,
                    ErrorMessage = $"ETA API Error: {response.StatusCode} - {errorContent}"
                };
            }
        }
        catch (Exception ex)
        {
            return new ETASubmissionResult
            {
                Success = false,
                ErrorMessage = $"Failed to submit to ETA: {ex.Message}"
            };
        }
    }
    
    /// <summary>
    /// Get detailed invoice status from ETA
    /// </summary>
    public async Task<ETASubmissionResult> GetInvoiceStatusAsync(string etaUuid)
    {
        try
        {
            var token = await GetAccessTokenAsync();
            if (string.IsNullOrEmpty(token))
            {
                return new ETASubmissionResult
                {
                    Success = false,
                    ErrorMessage = "Failed to authenticate with ETA"
                };
            }
            
            _httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            
            var response = await _httpClient.GetAsync($"/documentsubmissions/{etaUuid}");
            
            if (response.IsSuccessStatusCode)
            {
                var responseJson = await response.Content.ReadAsStringAsync();
                dynamic etaDoc = JsonSerializer.Deserialize<dynamic>(responseJson);
                
                var status = etaDoc?.status?.ToString() ?? "Unknown";
                var longId = etaDoc?.longId?.ToString();
                var internalId = etaDoc?.internalId?.ToString();
                
                return new ETASubmissionResult
                {
                    Success = true,
                    ETAStatus = status,
                    ETALongId = longId,
                    ETAInternalId = internalId,
                    ETAResponse = responseJson,
                    ValidationErrors = ParseETAValidationErrors(etaDoc)
                };
            }
            
            return new ETASubmissionResult
            {
                Success = false,
                ErrorMessage = $"Failed to get status: {response.StatusCode}"
            };
        }
        catch (Exception ex)
        {
            return new ETASubmissionResult
            {
                Success = false,
                ErrorMessage = $"Error getting invoice status: {ex.Message}"
            };
        }
    }
    
    /// <summary>
    /// Cancel an accepted invoice in ETA
    /// </summary>
    public async Task<ETASubmissionResult> CancelInvoiceAsync(string etaLongId)
    {
        try
        {
            var token = await GetAccessTokenAsync();
            _httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            
            var cancelRequest = new
            {
                status = "cancelled",
                reason = "Cancelled by issuer"
            };
            
            var json = JsonSerializer.Serialize(cancelRequest);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PutAsync($"/documents/{etaLongId}/state", content);
            
            if (response.IsSuccessStatusCode)
            {
                return new ETASubmissionResult
                {
                    Success = true,
                    ETAStatus = "Cancelled",
                    ETAResponse = await response.Content.ReadAsStringAsync()
                };
            }
            
            return new ETASubmissionResult
            {
                Success = false,
                ErrorMessage = $"Failed to cancel: {response.StatusCode}"
            };
        }
        catch (Exception ex)
        {
            return new ETASubmissionResult
            {
                Success = false,
                ErrorMessage = $"Error cancelling invoice: {ex.Message}"
            };
        }
    }
    
    private List<ETAValidationError>? ParseETAValidationErrors(dynamic etaDoc)
    {
        try
        {
            var errors = new List<ETAValidationError>();
            var validationResults = etaDoc?.validationResults;
            
            if (validationResults != null)
            {
                foreach (var error in validationResults.errors ?? new List<dynamic>())
                {
                    errors.Add(new ETAValidationError
                    {
                        Code = error.code?.ToString() ?? "UNKNOWN",
                        Message = error.message?.ToString() ?? "Unknown error",
                        Target = error.target?.ToString() ?? "",
                        PropertyPath = error.propertyPath?.ToString() ?? ""
                    });
                }
            }
            
            return errors.Count > 0 ? errors : null;
        }
        catch
        {
            return null;
        }
    }
    
    private async Task<string?> GetAccessTokenAsync()
    {
        try
        {
            var tokenRequest = new
            {
                grant_type = "client_credentials",
                client_id = _clientId,
                client_secret = _clientSecret,
                scope = "InvoicingAPI"
            };
            
            var json = JsonSerializer.Serialize(tokenRequest);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync("/connect/token", content);
            
            if (response.IsSuccessStatusCode)
            {
                var responseJson = await response.Content.ReadAsStringAsync();
                var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(responseJson, new JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
                });
                
                return tokenResponse?.AccessToken;
            }
            
            return null;
        }
        catch
        {
            return null;
        }
    }
    
    private object ConvertToETAFormat(EgyptianInvoice invoice)
    {
        // Convert to official ETA document format
        return new
        {
            issuer = new
            {
                name = invoice.Supplier.Name,
                id = invoice.Supplier.TaxNumber,
                type = "TRN",
                address = new
                {
                    branchID = invoice.Supplier.BranchId ?? "0",
                    governate = "CAI",
                    regionCity = "Cairo",
                    street = invoice.Supplier.Address,
                    buildingNumber = "1",
                    country = "EG"
                },
                activityCode = invoice.Supplier.ActivityCode
            },
            receiver = new
            {
                name = invoice.Customer.Name,
                id = invoice.Customer.TaxNumber ?? invoice.Customer.NationalId,
                type = !string.IsNullOrEmpty(invoice.Customer.TaxNumber) ? "TRN" : "NAT",
                address = new
                {
                    country = "EG",
                    governate = "CAI",
                    regionCity = "Cairo",
                    street = invoice.Customer.Address ?? "Unknown"
                }
            },
            documentType = invoice.DocumentType,
            documentTypeVersion = invoice.DocumentTypeVersion,
            dateTimeIssued = invoice.IssueDateTime.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            taxpayerActivityCode = invoice.Supplier.ActivityCode,
            internalID = invoice.InvoiceNumber,
            invoiceLines = invoice.Lines.Select(line => new
            {
                description = line.Description,
                itemType = "EGS",
                itemCode = line.ItemCode,
                unitType = line.UnitType,
                quantity = line.Quantity,
                salesTotal = line.NetAmount,
                total = line.LineTotal,
                valueDifference = 0,
                totalTaxableFees = 0,
                netTotal = line.NetAmount,
                itemsDiscount = line.DiscountAmount,
                unitValue = new
                {
                    currencySold = "EGP",
                    amountEGP = line.UnitPrice
                },
                discount = new
                {
                    rate = line.DiscountRate,
                    amount = line.DiscountAmount
                },
                taxableItems = new[]
                {
                    new
                    {
                        taxType = "T1",
                        amount = line.VatAmount,
                        subType = "V009",
                        rate = line.VatRate
                    }
                }
            }).ToArray(),
            totalDiscountAmount = invoice.Lines.Sum(l => l.DiscountAmount),
            totalSalesAmount = invoice.SubTotal,
            netAmount = invoice.SubTotal,
            taxTotals = new[]
            {
                new
                {
                    taxType = "T1",
                    amount = invoice.TotalVatAmount
                }
            },
            totalAmount = invoice.TotalAmount,
            extraDiscountAmount = 0,
            totalItemsDiscountAmount = invoice.Lines.Sum(l => l.DiscountAmount)
        };
    }
    
    private string GenerateMockETALongId()
    {
        return $"ETA{DateTime.UtcNow:yyyyMMdd}{new Random().Next(100000, 999999)}";
    }
    
    private string GenerateMockETAInternalId()
    {
        return $"INT{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
    }
}

public class ETAResponse
{
    public string? SubmissionUuid { get; set; }
    public string? AcceptanceStatus { get; set; }
    public List<object>? ValidMessages { get; set; }
    public List<object>? ErrorMessages { get; set; }
}

public class TokenResponse
{
    public string? AccessToken { get; set; }
    public string? TokenType { get; set; }
    public int ExpiresIn { get; set; }
}