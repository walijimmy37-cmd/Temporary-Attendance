export const APPS_SCRIPT_SOURCE = `/**
 * =========================================================================
 * COVENTRA ATTENDANCE & ABSENTEE RECORD SYSTEM - GOOGLE APPS SCRIPT BACKEND
 * =========================================================================
 * 
 * Features:
 * 1. Dual Support: Normal Check-In (Present) & Absentee Records (Absent).
 * 2. Automated Header Management: Automatically upgrades sheet headers to
 *    [Timestamp, Date, Time, Name, Status, Reason, Notes, Source, Unique Entry ID]
 *    without deleting or modifying existing attendance data.
 * 3. Absentee Styling: Absentee rows are automatically styled with light red 
 *    background (#FEE2E2) and dark red text (#991B1B).
 * 4. Duplicate & Conflict Protection: Prevents duplicate submissions and protects
 *    integrity by blocking accidental overwrites if an employee already checked in.
 * 5. Server-Side Timestamps & Entry IDs.
 */

// --- CONFIGURATION ---
// Leave empty if script is inside the Google Sheet (Extensions > Apps Script),
// or paste your Google Sheet ID if using a standalone Apps Script project.
var SHEET_ID = ""; 
var SHEET_NAME = "Attendance";

// Accidental duplicate window (2 minutes)
var DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

// Color formatting for Absentee rows
var ABSENT_BG_COLOR = "#FEE2E2";  // Light red
var ABSENT_TEXT_COLOR = "#991B1B"; // Dark red

function doGet(e) {
  var result = {
    status: "ok",
    service: "Attendance & Absentee Check-In API",
    timestamp: new Date().toISOString(),
    message: "Google Apps Script endpoint is live and ready."
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockError) {
    return createJsonResponse({
      success: false,
      message: "Server is busy processing another request. Please try again in a few seconds."
    });
  }

  try {
    Logger.log("--- New Attendance / Absence Request ---");
    Logger.log("Received parameters: " + (e && e.parameter ? JSON.stringify(e.parameter) : "none"));

    // 1. Read parameters primarily from e.parameter (standard form-urlencoded)
    var rawName = "";
    var status = "Present";
    var checkInType = "Check-In";
    var reason = "";
    var notes = "";
    var source = "Reception QR";

    if (e && e.parameter) {
      rawName = e.parameter.name || e.parameter.employeeName || "";
      status = e.parameter.status || "";
      checkInType = e.parameter.checkInType || "";
      reason = e.parameter.reason || "";
      notes = e.parameter.notes || "";
      source = e.parameter.source || "Reception QR";
    }

    // Fallback: Check postData if JSON or raw form-urlencoded was posted
    if (!rawName && e && e.postData && e.postData.contents) {
      try {
        var parsed = JSON.parse(e.postData.contents);
        rawName = parsed.name || parsed.employeeName || "";
        status = parsed.status || status;
        checkInType = parsed.checkInType || checkInType;
        reason = parsed.reason || reason;
        notes = parsed.notes || notes;
        source = parsed.source || source;
      } catch (jsonErr) {
        var qs = e.postData.contents;
        var pairs = qs.split("&");
        for (var i = 0; i < pairs.length; i++) {
          var pair = pairs[i].split("=");
          var key = decodeURIComponent(pair[0] || "");
          var val = decodeURIComponent((pair[1] || "").replace(/\\+/g, " "));
          if (key === "name" || key === "employeeName") rawName = val;
          if (key === "status") status = val;
          if (key === "checkInType") checkInType = val;
          if (key === "reason") reason = val;
          if (key === "notes") notes = val;
          if (key === "source") source = val;
        }
      }
    }

    // Determine whether this is an Absentee record or Check-In
    var isAbsence = false;
    if (status.toLowerCase() === "absent" || checkInType.toLowerCase() === "absent") {
      isAbsence = true;
      status = "Absent";
    } else {
      status = "Present";
      if (!checkInType) checkInType = "Check-In";
    }

    Logger.log("Mode: " + (isAbsence ? "ABSENCE" : "CHECK-IN") + " | Name: " + rawName);

    // 2. Validate name
    var normalizedName = normalizeNameScript(rawName);
    if (!normalizedName || normalizedName.length === 0) {
      return createJsonResponse({
        success: false,
        message: isAbsence 
          ? "Please enter or select the employee name to record an absence." 
          : "Please enter your name to record your attendance."
      });
    }

    if (normalizedName.length > 100) {
      return createJsonResponse({
        success: false,
        message: "Employee name is too long (maximum 100 characters)."
      });
    }

    // 3. Validate reason for Absence records
    if (isAbsence) {
      reason = (reason || "").toString().trim();
      if (reason.length === 0) {
        return createJsonResponse({
          success: false,
          message: "Please select or provide a reason for the absence."
        });
      }
      if (reason.length > 200) {
        return createJsonResponse({
          success: false,
          message: "Absence reason is too long (maximum 200 characters)."
        });
      }
      if (notes && notes.length > 500) {
        return createJsonResponse({
          success: false,
          message: "Notes are too long (maximum 500 characters)."
        });
      }
    }

    // 4. Get or initialize worksheet in Google Sheet
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss);

    // 5. Generate server-side timestamp, date, time
    var now = new Date();
    var timeZone = Session.getScriptTimeZone() || "GMT";
    var timestampStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd HH:mm:ss");
    var dateStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
    var timeStr = Utilities.formatDate(now, timeZone, "HH:mm");
    var dateCompact = Utilities.formatDate(now, timeZone, "yyyyMMdd");

    // 6. Duplicate & Conflict Check
    var duplicateResult = checkDuplicateOrConflict(sheet, normalizedName, dateStr, now.getTime(), isAbsence);
    if (duplicateResult.hasConflict) {
      Logger.log("Conflict / Duplicate blocked for " + normalizedName + ": " + duplicateResult.message);
      return createJsonResponse({
        success: false,
        isDuplicate: true,
        message: duplicateResult.message
      });
    }

    // 7. Generate unique entry ID
    var totalRows = sheet.getLastRow();
    var randomSuffix = ("000" + Math.floor(Math.random() * 1000)).slice(-3);
    var prefix = isAbsence ? "ABS-" : "ATT-";
    var entryId = prefix + dateCompact + "-" + ("00" + Math.max(1, totalRows)).slice(-3) + randomSuffix.charAt(0);

    // 8. Append record row to Google Sheet
    // Columns: [Timestamp, Date, Time, Name, Status, Reason, Notes, Source, Unique Entry ID]
    var rowData = [
      timestampStr,
      dateStr,
      timeStr,
      normalizedName,
      status,
      isAbsence ? reason : (checkInType !== "Check-In" ? checkInType : ""),
      notes || "",
      source,
      entryId
    ];

    sheet.appendRow(rowData);
    var newRowIndex = sheet.getLastRow();

    // 9. Format Absentee row with Red Styling
    if (isAbsence) {
      var rowRange = sheet.getRange(newRowIndex, 1, 1, rowData.length);
      rowRange.setBackground(ABSENT_BG_COLOR);
      rowRange.setFontColor(ABSENT_TEXT_COLOR);
      rowRange.setFontWeight("bold");
    }

    Logger.log("Row appended at index " + newRowIndex + " with ID: " + entryId);

    // 10. Return success confirmation
    var responseData = {
      success: true,
      message: isAbsence ? "Absence recorded successfully." : "Check-in recorded successfully. Thank you!",
      data: {
        id: entryId,
        name: normalizedName,
        status: status,
        reason: isAbsence ? reason : undefined,
        notes: notes || undefined,
        timestamp: timestampStr,
        date: dateStr,
        time: timeStr,
        checkInType: isAbsence ? undefined : checkInType,
        source: source
      }
    };

    return createJsonResponse(responseData);

  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return createJsonResponse({
      success: false,
      message: "Unable to process request: " + error.toString()
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

/**
 * Checks for duplicates or conflicts on the same date:
 * - If employee already checked in (Present) and attempts Absent: blocks with message.
 * - If employee already marked Absent and attempts Check-In: blocks with message.
 * - If same action submitted within duplicate window: blocks with duplicate notice.
 */
function checkDuplicateOrConflict(sheet, normalizedName, dateStr, currentTimestampMs, isSubmittingAbsence) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { hasConflict: false };

  var startRow = Math.max(2, lastRow - 99);
  var numRows = lastRow - startRow + 1;
  // Read first 5 columns: [Timestamp, Date, Time, Name, Status]
  var range = sheet.getRange(startRow, 1, numRows, 5);
  var values = range.getValues();
  var lowerTargetName = normalizedName.toLowerCase();

  for (var i = values.length - 1; i >= 0; i--) {
    var rowTimestamp = values[i][0];
    var rowDate = values[i][1];
    var rowName = (values[i][3] || "").toString().trim().toLowerCase();
    var rowStatus = (values[i][4] || "").toString().trim();

    if (rowName === lowerTargetName) {
      var rowDateStr = "";
      if (rowDate instanceof Date) {
        var timeZone = Session.getScriptTimeZone() || "GMT";
        rowDateStr = Utilities.formatDate(rowDate, timeZone, "yyyy-MM-dd");
      } else {
        rowDateStr = String(rowDate);
      }

      if (rowDateStr === dateStr || rowDateStr.indexOf(dateStr) !== -1) {
        var isExistingAbsence = (rowStatus.toLowerCase() === "absent");

        // Conflict 1: Employee is already checked in (Present), trying to record Absent
        if (!isExistingAbsence && isSubmittingAbsence) {
          return {
            hasConflict: true,
            message: "This employee already has an attendance record for today."
          };
        }

        // Conflict 2: Employee was recorded Absent, trying to check in
        if (isExistingAbsence && !isSubmittingAbsence) {
          return {
            hasConflict: true,
            message: "This employee already has an absence record for today."
          };
        }

        // Conflict 3: Duplicate submission of same type within recent window
        var rowTimeMs = rowTimestamp instanceof Date ? rowTimestamp.getTime() : new Date(rowTimestamp).getTime();
        if (rowTimeMs > 0 && Math.abs(currentTimestampMs - rowTimeMs) <= DUPLICATE_WINDOW_MS) {
          return {
            hasConflict: true,
            message: isSubmittingAbsence
              ? "An absence record has already been submitted for this employee today."
              : "You have already checked in recently."
          };
        }
      }
    }
  }

  return { hasConflict: false };
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
    throw new Error("Cannot open Spreadsheet. Please verify SHEET_ID or that script is attached to a Google Sheet.");
  }
  return ss;
}

/**
 * Gets or creates the 'Attendance' sheet and safely manages headers:
 * Automatically upgrades 7-column headers to 9-column headers preserving all existing data.
 */
function getOrCreateSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  var standardHeaders = [
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
    // Brand new sheet
    sheet.appendRow(standardHeaders);
    var headerRange = sheet.getRange(1, 1, 1, standardHeaders.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#F3F4F6");
    headerRange.setFontColor("#111827");
    sheet.setFrozenRows(1);
    for (var col = 1; col <= standardHeaders.length; col++) {
      sheet.autoResizeColumn(col);
    }
  } else {
    // Check if header needs upgrading from legacy structure
    var headerValues = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 7)).getValues()[0];
    var col5Name = (headerValues[4] || "").toString().trim().toLowerCase();
    
    if (col5Name === "check-in type" || sheet.getLastColumn() < 9) {
      Logger.log("Upgrading sheet headers to support Status, Reason, and Notes...");
      sheet.getRange(1, 1, 1, standardHeaders.length).setValues([standardHeaders]);
      var upgradedHeaderRange = sheet.getRange(1, 1, 1, standardHeaders.length);
      upgradedHeaderRange.setFontWeight("bold");
      upgradedHeaderRange.setBackground("#F3F4F6");
      upgradedHeaderRange.setFontColor("#111827");
      sheet.setFrozenRows(1);
    }
  }

  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
