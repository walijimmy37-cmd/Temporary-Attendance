/**
 * =========================================================================
 * TEMPORARY ATTENDANCE CHECK-IN SYSTEM - GOOGLE APPS SCRIPT BACKEND
 * =========================================================================
 * 
 * Instructions:
 * 1. Open Google Sheets (create a new sheet or use an existing one).
 * 2. In Google Sheets, click "Extensions" -> "Apps Script".
 * 3. Replace all code in the script editor with this file.
 * 4. Configure SHEET_ID (or leave empty to use the active spreadsheet if bound).
 * 5. Click "Deploy" -> "New deployment".
 * 6. Select type: "Web app".
 * 7. Set:
 *    - Description: "Attendance Check-In API"
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone" (allows check-in from phone without login)
 * 8. Click "Deploy", authorize permissions, and copy the "Web app URL".
 * 9. Paste the Web App URL into your frontend configuration or .env.
 */

// --- CONFIGURATION ---
// If this script is created directly inside the Google Sheet (Extensions > Apps Script),
// you can leave SHEET_ID as "" and it will use SpreadsheetApp.getActiveSpreadsheet().
// If standalone, paste your Google Sheet ID (from the spreadsheet URL).
var SHEET_ID = ""; 
var SHEET_NAME = "Attendance";

// Duplicate protection window in milliseconds (2 minutes = 120,000 ms)
var DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

/**
 * Handles HTTP GET requests (for testing and health checks).
 */
function doGet(e) {
  var result = {
    status: "ok",
    service: "Attendance Check-In API",
    timestamp: new Date().toISOString(),
    message: "Google Apps Script endpoint is live and ready to record check-ins."
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles HTTP POST requests (receives check-in submissions).
 */
function doPost(e) {
  // Use a lock to prevent race conditions during rapid concurrent check-ins
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for lock
    lock.waitLock(10000);
  } catch (lockError) {
    return createJsonResponse({
      success: false,
      message: "Server is busy. Please try again in a few seconds."
    });
  }

  try {
    // 1. Parse incoming payload
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Fallback for form-encoded or text parameters
        if (e.parameter) {
          data = e.parameter;
        } else {
          return createJsonResponse({
            success: false,
            message: "Invalid request data format."
          });
        }
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var rawName = data.name || "";
    var checkInType = data.checkInType || "Check-In";
    var source = data.source || "Reception QR";

    // 2. Validate and normalize name
    var normalizedName = normalizeNameScript(rawName);
    if (!normalizedName || normalizedName.length === 0) {
      return createJsonResponse({
        success: false,
        message: "Please enter your name to record your attendance."
      });
    }

    if (normalizedName.length > 100) {
      return createJsonResponse({
        success: false,
        message: "Name is too long (maximum 100 characters)."
      });
    }

    // 3. Access the Sheet
    var sheet = getOrCreateSheet();
    if (!sheet) {
      return createJsonResponse({
        success: false,
        message: "Unable to access the Attendance spreadsheet. Please verify SHEET_ID."
      });
    }

    // 4. Server-Side Timestamps & Formatted Values
    var now = new Date();
    var timeZone = Session.getScriptTimeZone() || "GMT";
    
    var timestampStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd HH:mm:ss");
    var dateStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
    var timeStr = Utilities.formatDate(now, timeZone, "HH:mm");
    var dateCompact = Utilities.formatDate(now, timeZone, "yyyyMMdd");

    // 5. Duplicate Check (within last 2 minutes for same name and date)
    if (isDuplicateCheckIn(sheet, normalizedName, dateStr, now.getTime())) {
      return createJsonResponse({
        success: false,
        isDuplicate: true,
        message: "You have already checked in recently. Please check again later if needed."
      });
    }

    // 6. Generate Unique Entry ID: ATT-YYYYMMDD-XXXX
    var totalRows = sheet.getLastRow();
    var sequenceNum = Math.max(1, totalRows); // sequence based on row or random suffix
    var randomSuffix = ("000" + Math.floor(Math.random() * 1000)).slice(-3);
    var entryId = "ATT-" + dateCompact + "-" + ("00" + sequenceNum).slice(-3) + randomSuffix.charAt(0);

    // 7. Append Row to Google Sheet
    // Columns: [Timestamp, Date, Time, Name, Check-In Type, Source, Unique Entry ID]
    sheet.appendRow([
      timestampStr,
      dateStr,
      timeStr,
      normalizedName,
      checkInType,
      source,
      entryId
    ]);

    // Return clean success response
    return createJsonResponse({
      success: true,
      message: "Check-in recorded successfully. Thank you!",
      data: {
        id: entryId,
        name: normalizedName,
        timestamp: timestampStr,
        date: dateStr,
        time: timeStr,
        checkInType: checkInType,
        source: source
      }
    });

  } catch (error) {
    return createJsonResponse({
      success: false,
      message: "An unexpected error occurred while recording check-in: " + error.toString()
    });
  } finally {
    // Release the lock
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/**
 * Normalizes name in Google Apps Script
 */
function normalizeNameScript(input) {
  if (!input) return "";
  var cleaned = input.toString().trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return "";
  
  // Truncate to 100 chars
  cleaned = cleaned.substring(0, 100);
  
  // Title Case words
  return cleaned
    .split(" ")
    .map(function(word) {
      return word
        .split("-")
        .map(function(subWord) {
          return subWord
            .split("'")
            .map(function(part) {
              if (part.length === 0) return "";
              return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            })
            .join("'");
        })
        .join("-");
    })
    .join(" ");
}

/**
 * Checks if the same name checked in within the last 2 minutes on the same date.
 */
function isDuplicateCheckIn(sheet, normalizedName, dateStr, currentTimestampMs) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false; // Only header exists

  // Scan recent rows (up to the last 20 rows for performance)
  var startRow = Math.max(2, lastRow - 19);
  var numRows = lastRow - startRow + 1;
  
  // Columns: [1: Timestamp, 2: Date, 3: Time, 4: Name, ...]
  var range = sheet.getRange(startRow, 1, numRows, 4);
  var values = range.getValues();

  var lowerTargetName = normalizedName.toLowerCase();

  for (var i = values.length - 1; i >= 0; i--) {
    var rowTimestamp = values[i][0];
    var rowDate = values[i][1];
    var rowName = (values[i][3] || "").toString().trim().toLowerCase();

    if (rowName === lowerTargetName) {
      // Check if on the same date
      var rowDateStr = "";
      if (rowDate instanceof Date) {
        var timeZone = Session.getScriptTimeZone() || "GMT";
        rowDateStr = Utilities.formatDate(rowDate, timeZone, "yyyy-MM-dd");
      } else {
        rowDateStr = String(rowDate);
      }

      if (rowDateStr === dateStr || rowDateStr.indexOf(dateStr) !== -1) {
        // Check time difference
        var rowTimeMs = 0;
        if (rowTimestamp instanceof Date) {
          rowTimeMs = rowTimestamp.getTime();
        } else {
          rowTimeMs = new Date(rowTimestamp).getTime();
        }

        if (rowTimeMs > 0 && Math.abs(currentTimestampMs - rowTimeMs) <= DUPLICATE_WINDOW_MS) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Gets or creates the worksheet and configures headers.
 */
function getOrCreateSheet() {
  var ss;
  if (SHEET_ID && SHEET_ID.trim() !== "" && SHEET_ID !== "YOUR_GOOGLE_SHEET_ID") {
    ss = SpreadsheetApp.openById(SHEET_ID.trim());
  } else {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      // Fallback
    }
  }

  if (!ss) {
    throw new Error("Cannot open Spreadsheet. Provide SHEET_ID or bind script to sheet.");
  }

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Check and setup headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    var headers = [
      "Timestamp",
      "Date",
      "Time",
      "Name",
      "Check-In Type",
      "Source",
      "Unique Entry ID"
    ];
    sheet.appendRow(headers);

    // Format headers
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#F3F4F6");
    headerRange.setFontColor("#111827");
    sheet.setFrozenRows(1);

    // Auto-fit columns
    for (var col = 1; col <= headers.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  return sheet;
}

/**
 * Creates a JSON response with proper CORS/Content type.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
