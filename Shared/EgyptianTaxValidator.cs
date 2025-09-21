using System.Text.RegularExpressions;

namespace EgyVAT.Shared;

/// <summary>
/// Egyptian Tax Authority (ETA) validation rules based on official requirements
/// </summary>
public static class EgyptianTaxValidator
{
    // ==================== Tax Number Validation ====================
    public static bool IsValidTaxNumber(string? taxNumber)
    {
        if (string.IsNullOrWhiteSpace(taxNumber)) return false;
        
        // Egyptian tax number must be exactly 9 digits
        if (!Regex.IsMatch(taxNumber, @"^\d{9}$")) return false;
        
        // Apply checksum validation (Luhn algorithm variant used by ETA)
        return ValidateTaxNumberChecksum(taxNumber);
    }
    
    private static bool ValidateTaxNumberChecksum(string taxNumber)
    {
        // ETA uses a weighted checksum for tax numbers
        int[] weights = { 9, 8, 7, 6, 5, 4, 3, 2, 1 };
        int sum = 0;
        
        for (int i = 0; i < 9; i++)
        {
            sum += (taxNumber[i] - '0') * weights[i];
        }
        
        // Valid if divisible by 11 (ETA rule)
        return sum % 11 == 0;
    }
    
    // ==================== National ID Validation ====================
    public static bool IsValidNationalId(string? nationalId)
    {
        if (string.IsNullOrWhiteSpace(nationalId)) return false;
        
        // Egyptian National ID must be exactly 14 digits
        if (!Regex.IsMatch(nationalId, @"^\d{14}$")) return false;
        
        // Validate structure: Century(1) + YY(2) + MM(2) + DD(2) + Governorate(2) + Sequence(4) + CheckDigit(1)
        
        // Century: 2 for 1900-1999, 3 for 2000-2099
        int century = nationalId[0] - '0';
        if (century != 2 && century != 3) return false;
        
        // Extract date components
        int year = int.Parse(nationalId.Substring(1, 2));
        int month = int.Parse(nationalId.Substring(3, 2));
        int day = int.Parse(nationalId.Substring(5, 2));
        
        // Validate month (01-12)
        if (month < 1 || month > 12) return false;
        
        // Validate day (01-31)
        if (day < 1 || day > 31) return false;
        
        // Validate governorate code (01-35, 88 for foreign births)
        int governorate = int.Parse(nationalId.Substring(7, 2));
        if (!IsValidGovernorateCode(governorate)) return false;
        
        return true;
    }
    
    private static bool IsValidGovernorateCode(int code)
    {
        // Valid Egyptian governorate codes
        var validCodes = new HashSet<int> 
        { 
            01, 02, 03, 04, 11, 12, 13, 14, 15, 16, 17, 18, 19,
            21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35,
            88 // Foreign births
        };
        return validCodes.Contains(code);
    }
    
    // ==================== Passport Validation ====================
    public static bool IsValidPassportNumber(string? passport)
    {
        if (string.IsNullOrWhiteSpace(passport)) return false;
        
        // Passport must be alphanumeric, 6-20 characters
        return Regex.IsMatch(passport, @"^[A-Z0-9]{6,20}$", RegexOptions.IgnoreCase);
    }
    
    // ==================== Invoice Validation ====================
    public static List<ValidationError> ValidateInvoice(EgyptianInvoice invoice)
    {
        var errors = new List<ValidationError>();
        
        // Validate supplier
        if (!IsValidTaxNumber(invoice.Supplier.TaxNumber))
        {
            errors.Add(new ValidationError 
            { 
                Field = "Supplier.TaxNumber",
                Code = "ETA-001",
                Message = "Supplier must have a valid 9-digit Egyptian tax number"
            });
        }
        
        // Validate customer based on type
        if (invoice.Customer.Type == CustomerType.B2B)
        {
            if (!IsValidTaxNumber(invoice.Customer.TaxNumber))
            {
                errors.Add(new ValidationError
                {
                    Field = "Customer.TaxNumber",
                    Code = "ETA-002",
                    Message = "B2B customer must have a valid 9-digit tax number"
                });
            }
        }
        else if (invoice.Customer.Type == CustomerType.B2C)
        {
            if (!IsValidNationalId(invoice.Customer.NationalId) && 
                !IsValidPassportNumber(invoice.Customer.PassportNumber))
            {
                errors.Add(new ValidationError
                {
                    Field = "Customer.NationalId",
                    Code = "ETA-003",
                    Message = "B2C customer must have a valid 14-digit national ID or passport number"
                });
            }
        }
        
        // Validate invoice lines
        if (invoice.Lines == null || invoice.Lines.Count == 0)
        {
            errors.Add(new ValidationError
            {
                Field = "Lines",
                Code = "ETA-004",
                Message = "Invoice must contain at least one line item"
            });
        }
        else
        {
            for (int i = 0; i < invoice.Lines.Count; i++)
            {
                var line = invoice.Lines[i];
                
                // Validate GS1/EGS code
                if (!IsValidGS1Code(line.GS1Code))
                {
                    errors.Add(new ValidationError
                    {
                        Field = $"Lines[{i}].GS1Code",
                        Code = "ETA-005",
                        Message = $"Line {i+1}: Invalid GS1/EGS code format"
                    });
                }
                
                // Validate quantities and amounts
                if (line.Quantity <= 0)
                {
                    errors.Add(new ValidationError
                    {
                        Field = $"Lines[{i}].Quantity",
                        Code = "ETA-006",
                        Message = $"Line {i+1}: Quantity must be positive"
                    });
                }
                
                if (line.UnitPrice < 0)
                {
                    errors.Add(new ValidationError
                    {
                        Field = $"Lines[{i}].UnitPrice",
                        Code = "ETA-007",
                        Message = $"Line {i+1}: Unit price cannot be negative"
                    });
                }
                
                // Validate VAT rate (Egyptian standard is 14%, some items 0%)
                if (line.VatRate != 14 && line.VatRate != 0)
                {
                    errors.Add(new ValidationError
                    {
                        Field = $"Lines[{i}].VatRate",
                        Code = "ETA-008",
                        Message = $"Line {i+1}: VAT rate must be 14% or 0% (exempt)"
                    });
                }
            }
        }
        
        // Validate total amounts
        if (invoice.TotalAmount <= 0)
        {
            errors.Add(new ValidationError
            {
                Field = "TotalAmount",
                Code = "ETA-009",
                Message = "Invoice total must be positive"
            });
        }
        
        // Validate activity code
        if (!IsValidActivityCode(invoice.Supplier.ActivityCode))
        {
            errors.Add(new ValidationError
            {
                Field = "Supplier.ActivityCode",
                Code = "ETA-010",
                Message = "Invalid ETA activity code"
            });
        }
        
        return errors;
    }
    
    // ==================== GS1/EGS Code Validation ====================
    public static bool IsValidGS1Code(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;
        
        // GS1/EGS codes in Egypt are typically 8-16 digits
        return Regex.IsMatch(code, @"^\d{8,16}$");
    }
    
    // ==================== Activity Code Validation ====================
    public static bool IsValidActivityCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;
        
        // Egyptian activity codes are typically 4-5 digits
        return Regex.IsMatch(code, @"^\d{4,5}$");
    }
    
    // ==================== Invoice Number Generation ====================
    public static string GenerateInvoiceNumber(string? prefix = "INV")
    {
        // Format: PREFIX-YYYYMMDD-HHMMSS-XXXX (random)
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        var random = new Random().Next(1000, 9999);
        return $"{prefix}-{timestamp}-{random}";
    }
    
    // ==================== Customer Type Detection ====================
    public static CustomerType DetermineCustomerType(string? taxNumber, string? nationalId, string? passport)
    {
        if (IsValidTaxNumber(taxNumber))
            return CustomerType.B2B;
        
        if (IsValidNationalId(nationalId))
            return CustomerType.B2C;
        
        if (IsValidPassportNumber(passport))
            return CustomerType.F;
        
        return CustomerType.B2C; // Default to B2C
    }
    
    // ==================== GS1 Code Mapping ====================
    public static string MapToGS1Code(string description)
    {
        // Common Egyptian GS1/EGS codes based on product/service description
        var descLower = description.ToLower();
        
        return descLower switch
        {
            var d when d.Contains("software") || d.Contains("برمجيات") => "6220100000",
            var d when d.Contains("consulting") || d.Contains("استشارات") => "7020100000",
            var d when d.Contains("training") || d.Contains("تدريب") => "8559100000",
            var d when d.Contains("hardware") || d.Contains("computer") => "4741000000",
            var d when d.Contains("medical") || d.Contains("طبي") => "8620100000",
            var d when d.Contains("legal") || d.Contains("قانوني") => "6910100000",
            var d when d.Contains("accounting") || d.Contains("محاسبة") => "6920100000",
            var d when d.Contains("engineering") || d.Contains("هندسة") => "7112100000",
            var d when d.Contains("construction") || d.Contains("بناء") => "4100100000",
            var d when d.Contains("food") || d.Contains("طعام") => "5610100000",
            var d when d.Contains("transport") || d.Contains("نقل") => "4922100000",
            _ => "10000000" // Default service code
        };
    }
}
