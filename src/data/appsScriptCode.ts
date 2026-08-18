export const APPS_SCRIPT_SOURCE = `/**
 * =========================================================================
 * COVENTRA ATTENDANCE CHECK-IN SYSTEM - GOOGLE APPS SCRIPT BACKEND
 * =========================================================================
 */

// --- CONFIGURATION ---
// Leave empty if script is inside the Google Sheet (Extensions > Apps Script),
// or paste your Google Sheet ID if using a standalone Apps Script project.
var SHEET_ID = ""; 
var SHEET_NAME = "Attendance";

// Accidental duplicate window (2 minutes)
var DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

function doGet(e) {
  var result = {
    status: "ok",
    service: "Attendance Check-In API"
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockError) {
    return createJsonResponse({
      success: false,
      message: "Server is busy. Please try again in a few seconds."
    });
  }

  try {
    Logger.log("--- New Check-In Request ---");
    Logger.log("Received parameters: " + (e && e.parameter ? JSON.stringify(e.parameter) : "none"));

    // 1. Read parameters primarily from e.parameter (standard form-urlencoded)
    var rawName = "";
    var checkInType = "Check-In";
    var source = "Reception QR";

    if (e && e.parameter) {
      rawName = e.parameter.name || "";
      checkInType = e.parameter.checkInType || "Check-In";
      source = e.parameter.source || "Reception QR";
    }

    // Fallback: Check postData if form-urlencoded or JSON was posted in body
    if (!rawName && e && e.postData && e.postData.contents) {
      try {
        var parsed = JSON.parse(e.postData.contents);
        rawName = parsed.name || "";
        checkInType = parsed.checkInType || checkInType;
        source = parsed.source || source;
      } catch (jsonErr) {
        // Not JSON - check if form-encoded string
        var qs = e.postData.contents;
        var pairs = qs.split("&");
        for (var i = 0; i < pairs.length; i++) {
          var pair = pairs[i].split("=");
          var key = decodeURIComponent(pair[0] || "");
          var val = decodeURIComponent((pair[1] || "").replace(/\\+/g, " "));
          if (key === "name") rawName = val;
          if (key === "checkInType") checkInType = val;
          if (key === "source") source = val;
        }
      }
    }

    Logger.log("Received name: " + rawName);

    // 2. Validate name
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

    // 3. Get or create worksheet in Google Sheet
    var ss = getSpreadsheet();
    Logger.log("Spreadsheet: " + ss.getName());
    var sheet = getOrCreateSheet(ss);
    Logger.log("Sheet: " + sheet.getName());
    Logger.log("Row number before append: " + sheet.getLastRow());

    // 4. Generate timestamp, date, time
    var now = new Date();
    var timeZone = Session.getScriptTimeZone() || "GMT";
    var timestampStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd HH:mm:ss");
    var dateStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
    var timeStr = Utilities.formatDate(now, timeZone, "HH:mm");
    var dateCompact = Utilities.formatDate(now, timeZone, "yyyyMMdd");

    // 5. Check recent duplicate within 2 minutes
    if (isDuplicateCheckIn(sheet, normalizedName, dateStr, now.getTime())) {
      Logger.log("Duplicate check-in detected for: " + normalizedName);
      return createJsonResponse({
        success: false,
        isDuplicate: true,
        message: "You have already checked in recently."
      });
    }

    // 6. Generate unique attendance ID
    var totalRows = sheet.getLastRow();
    var randomSuffix = ("000" + Math.floor(Math.random() * 1000)).slice(-3);
    var entryId = "ATT-" + dateCompact + "-" + ("00" + Math.max(1, totalRows)).slice(-3) + randomSuffix.charAt(0);
    Logger.log("Generated entry ID: " + entryId);

    // 7. Append the row (Timestamp, Date, Time, Name, Check-In Type, Source, Unique Entry ID)
    Logger.log("Writing attendance row");
    sheet.appendRow([
      timestampStr,
      dateStr,
      timeStr,
      normalizedName,
      checkInType,
      source,
      entryId
    ]);
    Logger.log("Attendance row written successfully");

    var responseData = {
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
    };

    Logger.log("Returned response: " + JSON.stringify(responseData));
    return createJsonResponse(responseData);

  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return createJsonResponse({
      success: false,
      message: "Unable to record check-in: " + error.toString()
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function normalizeNameScript(input) {
  if (!input) return "";
  var cleaned = input.toString().trim().replace(/\\s+/g, " ");
  if (cleaned.length === 0) return "";
  cleaned = cleaned.substring(0, 100);
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

function isDuplicateCheckIn(sheet, normalizedName, dateStr, currentTimestampMs) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  var startRow = Math.max(2, lastRow - 19);
  var numRows = lastRow - startRow + 1;
  var range = sheet.getRange(startRow, 1, numRows, 4);
  var values = range.getValues();
  var lowerTargetName = normalizedName.toLowerCase();

  for (var i = values.length - 1; i >= 0; i--) {
    var rowTimestamp = values[i][0];
    var rowDate = values[i][1];
    var rowName = (values[i][3] || "").toString().trim().toLowerCase();

    if (rowName === lowerTargetName) {
      var rowDateStr = "";
      if (rowDate instanceof Date) {
        var timeZone = Session.getScriptTimeZone() || "GMT";
        rowDateStr = Utilities.formatDate(rowDate, timeZone, "yyyy-MM-dd");
      } else {
        rowDateStr = String(rowDate);
      }

      if (rowDateStr === dateStr || rowDateStr.indexOf(dateStr) !== -1) {
        var rowTimeMs = rowTimestamp instanceof Date ? rowTimestamp.getTime() : new Date(rowTimestamp).getTime();
        if (rowTimeMs > 0 && Math.abs(currentTimestampMs - rowTimeMs) <= DUPLICATE_WINDOW_MS) {
          return true;
        }
      }
    }
  }
  return false;
}

function getSpreadsheet() {
  var ss;
  if (SHEET_ID && SHEET_ID.trim() !== "") {
    ss = SpreadsheetApp.openById(SHEET_ID.trim());
  } else {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {}
  }

  if (!ss) {
    throw new Error("Cannot open Spreadsheet. Please verify SHEET_ID or script is attached to a Google Sheet.");
  }
  return ss;
}

function getOrCreateSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    var headers = ["Timestamp", "Date", "Time", "Name", "Check-In Type", "Source", "Unique Entry ID"];
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#F3F4F6");
    headerRange.setFontColor("#111827");
    sheet.setFrozenRows(1);
    for (var col = 1; col <= headers.length; col++) {
      sheet.autoResizeColumn(col);
    }
  }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
