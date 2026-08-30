export const APPS_SCRIPT_SOURCE = `/**
 * =========================================================================
 * COVENTRA ATTENDANCE - CLEAN GOOGLE APPS SCRIPT BACKEND
 * =========================================================================
 * 
 * Google Sheet: Coventra Attendance
 * Worksheet Tab: Attendance
 * Columns (9 Columns A to I):
 * A: Timestamp
 * B: Date
 * C: Time
 * D: Name
 * E: Status (Present | Short Leave | Absent)
 * F: Reason
 * G: Notes
 * H: Source (Reception QR | LINK)
 * I: Unique Entry ID (ATT- | SL- | ABS-)
 */

// Configuration
var SHEET_NAME = "Attendance";
var DUPLICATE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

// Row Styling Colors
var SHORT_LEAVE_BG = "#FEF3C7";   // Light yellow/orange
var SHORT_LEAVE_TEXT = "#92400E"; // Dark amber text

var ABSENT_BG = "#FEE2E2";        // Light red
var ABSENT_TEXT = "#991B1B";      // Dark red text

/**
 * Health check endpoint
 */
function doGet(e) {
  var result = {
    status: "ok",
    service: "Coventra Attendance API",
    timestamp: new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main form submission handler
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockError) {
    return createJsonResponse({
      success: false,
      message: "Server is busy processing another request. Please try again."
    });
  }

  try {
    var rawName = "";
    var rawStatus = "Present";
    var rawReason = "";
    var rawNotes = "";

    // 1. Read form-urlencoded parameters
    if (e && e.parameter) {
      rawName = e.parameter.name || e.parameter.employeeName || "";
      rawStatus = e.parameter.status || e.parameter.checkInType || "Present";
      rawReason = e.parameter.reason || "";
      rawNotes = e.parameter.notes || "";
    }

    // Fallback if raw body is sent
    if (!rawName && e && e.postData && e.postData.contents) {
      try {
        var parsed = JSON.parse(e.postData.contents);
        rawName = parsed.name || parsed.employeeName || "";
        rawStatus = parsed.status || parsed.checkInType || "Present";
        rawReason = parsed.reason || "";
        rawNotes = parsed.notes || "";
      } catch (jsonErr) {
        var qs = e.postData.contents;
        var pairs = qs.split("&");
        for (var i = 0; i < pairs.length; i++) {
          var pair = pairs[i].split("=");
          var key = decodeURIComponent(pair[0] || "");
          var val = decodeURIComponent((pair[1] || "").replace(/\\+/g, " "));
          if (key === "name" || key === "employeeName") rawName = val;
          if (key === "status" || key === "checkInType") rawStatus = val;
          if (key === "reason") rawReason = val;
          if (key === "notes") rawNotes = val;
        }
      }
    }

    // 2. Normalize and validate Name
    var normalizedName = normalizeNameScript(rawName);
    if (!normalizedName) {
      return createJsonResponse({
        success: false,
        message: "Please enter your name."
      });
    }

    // 3. Determine and normalize Status
    var status = "Present";
    var lowerStatus = (rawStatus || "").toString().trim().toLowerCase();
    if (lowerStatus === "short leave" || lowerStatus === "shortleave") {
      status = "Short Leave";
    } else if (lowerStatus === "absent" || lowerStatus === "absence") {
      status = "Absent";
    } else {
      status = "Present";
    }

    // 4. Server-controlled Source and Reason/Notes validation
    var source = "Reception QR";
    var finalReason = "";
    var finalNotes = "";

    if (status === "Short Leave") {
      source = "LINK";
      finalReason = (rawReason || "").toString().trim();
      finalNotes = ""; // Notes remain blank for Short Leave

      if (!finalReason) {
        return createJsonResponse({
          success: false,
          message: "Please enter a reason for your short leave."
        });
      }
    } else if (status === "Absent") {
      source = "LINK";
      finalReason = (rawReason || "").toString().trim();
      finalNotes = (rawNotes || "").toString().trim();

      if (!finalReason) {
        return createJsonResponse({
          success: false,
          message: "Please select or enter an absence reason."
        });
      }
    } else {
      // Status === "Present"
      source = "Reception QR";
      finalReason = "";
      finalNotes = "";
    }

    // 5. Get or initialize Attendance worksheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateAttendanceSheet(ss);

    // 6. Generate server-side Date and Timestamps
    var now = new Date();
    var timeZone = Session.getScriptTimeZone() || "GMT";
    var timestampStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd HH:mm:ss");
    var dateStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
    var timeStr = Utilities.formatDate(now, timeZone, "HH:mm:ss");
    var timeShort = Utilities.formatDate(now, timeZone, "HH:mm");
    var dateCompact = Utilities.formatDate(now, timeZone, "yyyyMMdd");

    // 7. Duplicate Check (2-minute window)
    if (isDuplicateSubmission(sheet, normalizedName, now.getTime())) {
      return createJsonResponse({
        success: false,
        isDuplicate: true,
        message: "You have already submitted a record recently. Please try again later."
      });
    }

    // 8. Generate server-side Unique Entry ID
    var entryId = generateUniqueId(status, dateCompact);

    // 9. Append Row (9 Columns: A through I)
    var rowData = [
      timestampStr,   // A: Timestamp
      dateStr,        // B: Date
      timeStr,        // C: Time
      normalizedName, // D: Name
      status,         // E: Status
      finalReason,    // F: Reason
      finalNotes,     // G: Notes
      source,         // H: Source
      entryId         // I: Unique Entry ID
    ];

    sheet.appendRow(rowData);
    var newRowIndex = sheet.getLastRow();

    // 10. Server-Side Visual Row Formatting
    if (status === "Short Leave") {
      var slRange = sheet.getRange(newRowIndex, 1, 1, 9);
      slRange.setBackground(SHORT_LEAVE_BG);
      slRange.setFontColor(SHORT_LEAVE_TEXT);
      slRange.setFontWeight("bold");
    } else if (status === "Absent") {
      var absRange = sheet.getRange(newRowIndex, 1, 1, 9);
      absRange.setBackground(ABSENT_BG);
      absRange.setFontColor(ABSENT_TEXT);
      absRange.setFontWeight("bold");
    }

    // 11. Build Response
    var responseData = {
      id: entryId,
      name: normalizedName,
      status: status,
      timestamp: timestampStr,
      date: dateStr,
      time: timeShort,
      source: source
    };

    var successMessage = "Check-in recorded successfully.";
    if (status === "Short Leave") {
      successMessage = "Short leave recorded successfully.";
      responseData.reason = finalReason;
    } else if (status === "Absent") {
      successMessage = "Absence recorded successfully.";
      responseData.reason = finalReason;
      if (finalNotes) responseData.notes = finalNotes;
    }

    return createJsonResponse({
      success: true,
      message: successMessage,
      data: responseData
    });

  } catch (error) {
    return createJsonResponse({
      success: false,
      message: "Unable to process record: " + error.toString()
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/**
 * Generates unique entry ID:
 * - ATT-YYYYMMDD-XXXXX (Present)
 * - SL-YYYYMMDD-XXXXX  (Short Leave)
 * - ABS-YYYYMMDD-XXXXX (Absent)
 */
function generateUniqueId(status, dateCompact) {
  var prefix = "ATT-";
  if (status === "Short Leave") prefix = "SL-";
  else if (status === "Absent") prefix = "ABS-";

  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var randomPart = "";
  for (var i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + dateCompact + "-" + randomPart;
}

/**
 * Formats name to Title Case
 */
function normalizeNameScript(input) {
  if (!input) return "";
  var cleaned = input.toString().trim().replace(/\\s+/g, " ");
  if (!cleaned) return "";

  var lowercaseWords = ["van", "von", "der", "den", "de", "da", "di", "al", "bin", "ibn"];

  return cleaned
    .split(" ")
    .map(function(word, idx) {
      if (word.length === 0) return "";
      var lower = word.toLowerCase();
      if (idx > 0 && lowercaseWords.indexOf(lower) !== -1) {
        return lower;
      }
      if (lower.indexOf("mc") === 0 && word.length > 2) {
        return "Mc" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
      }
      if (lower.indexOf("o'") === 0 && word.length > 2) {
        return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Checks for duplicate submissions by the same person within 2 minutes
 */
function isDuplicateSubmission(sheet, name, currentTimestampMs) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  var startRow = Math.max(2, lastRow - 50);
  var numRows = lastRow - startRow + 1;
  var range = sheet.getRange(startRow, 1, numRows, 4); // Columns A to D
  var values = range.getValues();
  var lowerName = name.toLowerCase();

  for (var i = values.length - 1; i >= 0; i--) {
    var rowTimestamp = values[i][0];
    var rowName = (values[i][3] || "").toString().trim().toLowerCase();

    if (rowName === lowerName) {
      var rowTimeMs = rowTimestamp instanceof Date ? rowTimestamp.getTime() : new Date(rowTimestamp).getTime();
      if (rowTimeMs > 0 && Math.abs(currentTimestampMs - rowTimeMs) <= DUPLICATE_WINDOW_MS) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Ensures worksheet and 9-column headers exist
 */
function getOrCreateAttendanceSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  var REQUIRED_HEADERS = [
    "Timestamp",
    "Date",
    "Time",
    "Name",
    "Status",
    "Reason",
    "Notes",
    "Source",
    "Unique Entry ID"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(REQUIRED_HEADERS);
    var hRange = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length);
    hRange.setFontWeight("bold");
    hRange.setBackground("#F3F4F6");
    hRange.setFontColor("#111827");
    sheet.setFrozenRows(1);
    for (var col = 1; col <= REQUIRED_HEADERS.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }

  return sheet;
}

/**
 * Helper to return JSON response
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
