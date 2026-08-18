export const APPS_SCRIPT_SOURCE = `/**
 * =========================================================================
 * TEMPORARY ATTENDANCE CHECK-IN SYSTEM - GOOGLE APPS SCRIPT BACKEND
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
    service: "Attendance Check-In API",
    timestamp: new Date().toISOString(),
    message: "Google Apps Script endpoint is live and ready."
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
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        if (e.parameter) {
          data = e.parameter;
        } else {
          return createJsonResponse({ success: false, message: "Invalid JSON format." });
        }
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var rawName = data.name || "";
    var checkInType = data.checkInType || "Check-In";
    var source = data.source || "Reception QR";

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

    var sheet = getOrCreateSheet();
    if (!sheet) {
      return createJsonResponse({
        success: false,
        message: "Unable to access Attendance sheet."
      });
    }

    var now = new Date();
    var timeZone = Session.getScriptTimeZone() || "GMT";
    var timestampStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd HH:mm:ss");
    var dateStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
    var timeStr = Utilities.formatDate(now, timeZone, "HH:mm");
    var dateCompact = Utilities.formatDate(now, timeZone, "yyyyMMdd");

    // Check recent duplicate within 2 minutes
    if (isDuplicateCheckIn(sheet, normalizedName, dateStr, now.getTime())) {
      return createJsonResponse({
        success: false,
        isDuplicate: true,
        message: "You have already checked in recently."
      });
    }

    // Unique Entry ID
    var totalRows = sheet.getLastRow();
    var randomSuffix = ("000" + Math.floor(Math.random() * 1000)).slice(-3);
    var entryId = "ATT-" + dateCompact + "-" + ("00" + Math.max(1, totalRows)).slice(-3) + randomSuffix.charAt(0);

    // Append row
    sheet.appendRow([
      timestampStr,
      dateStr,
      timeStr,
      normalizedName,
      checkInType,
      source,
      entryId
    ]);

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

function getOrCreateSheet() {
  var ss;
  if (SHEET_ID && SHEET_ID.trim() !== "") {
    ss = SpreadsheetApp.openById(SHEET_ID.trim());
  } else {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {}
  }

  if (!ss) {
    throw new Error("Cannot open Spreadsheet.");
  }

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
