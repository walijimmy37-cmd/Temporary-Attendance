export const APPS_SCRIPT_SOURCE = `/**
 * =========================================================================
 * COVENTRA ATTENDANCE & ABSENTEE RECORD SYSTEM - GOOGLE APPS SCRIPT BACKEND
 * =========================================================================
 * 
 * Google Sheet: Attendance
 * Columns (9 Required Columns):
 * A: Timestamp
 * B: Date
 * C: Time
 * D: Name
 * E: Status (Present / Absent)
 * F: Reason (Absence reason or blank for normal check-in)
 * G: Notes (Optional notes for absence or blank for normal check-in)
 * H: Source (e.g. Reception QR)
 * I: Unique Entry ID (ATT-YYYYMMDD-XXXXX or ABS-YYYYMMDD-XXXXX)
 * 
 * Features:
 * 1. Dual Support: Normal Check-In (Present) & Absentee Records (Absent).
 * 2. Automated Header Migration: Automatically migrates existing sheets to the 
 *    exact 9 required columns without deleting, clearing, or overwriting existing records.
 * 3. Server-Side Red Formatting: Absentee rows (Columns A:I) are automatically styled
 *    with light red background (#FEE2E2) and dark red text (#991B1B).
 * 4. Unique ID Generation: ATT-YYYYMMDD-XXXXX for attendance, ABS-YYYYMMDD-XXXXX for absence.
 * 5. Duplicate & Conflict Protection.
 */

// --- CONFIGURATION ---
// Leave empty if script is inside the Google Sheet (Extensions > Apps Script),
// or paste your Google Sheet ID if using a standalone Apps Script project.
var SHEET_ID = ""; 
var SHEET_NAME = "Attendance";

// Accidental duplicate window (2 minutes)
var DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

// Color formatting for Absentee rows
var ABSENT_BG_COLOR = "#FEE2E2";   // Light red
var ABSENT_TEXT_COLOR = "#991B1B"; // Dark red

function doGet(e) {
  var result = {
    status: "ok",
    service: "Coventra Attendance & Absentee API",
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

    // Fallback: Check postData if raw form-urlencoded or JSON was posted
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

    // 4. Get or initialize worksheet in Google Sheet and ensure 9 columns
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss);

    // 5. Generate server-side timestamp, date, time
    var now = new Date();
    var timeZone = Session.getScriptTimeZone() || "GMT";
    var timestampStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd HH:mm:ss");
    var dateStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
    var timeStr = Utilities.formatDate(now, timeZone, "HH:mm:ss");
    var timeShort = Utilities.formatDate(now, timeZone, "HH:mm");
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

    // 7. Generate unique entry ID server-side
    var entryId = generateEntryIdServer(isAbsence, dateCompact);

    // 8. Append record row to Google Sheet (Exact 9 Columns)
    // Column A: Timestamp
    // Column B: Date
    // Column C: Time
    // Column D: Name
    // Column E: Status (Present / Absent)
    // Column F: Reason (Absence Reason or blank)
    // Column G: Notes (Notes or blank)
    // Column H: Source (Reception QR)
    // Column I: Unique Entry ID
    var rowData = [
      timestampStr,
      dateStr,
      timeStr,
      normalizedName,
      isAbsence ? "Absent" : "Present",
      isAbsence ? reason : "",
      isAbsence ? (notes || "") : "",
      source,
      entryId
    ];

    sheet.appendRow(rowData);
    var newRowIndex = sheet.getLastRow();

    // 9. Format Absentee row with Red Styling (Server-Side)
    if (isAbsence) {
      var rowRange = sheet.getRange(newRowIndex, 1, 1, 9);
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
        status: isAbsence ? "Absent" : "Present",
        reason: isAbsence ? reason : undefined,
        notes: (isAbsence && notes) ? notes : undefined,
        timestamp: timestampStr,
        date: dateStr,
        time: timeShort,
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

/**
 * Generates server-side unique entry ID:
 * - ATT-YYYYMMDD-XXXXX for normal attendance
 * - ABS-YYYYMMDD-XXXXX for absence records
 */
function generateEntryIdServer(isAbsence, dateCompact) {
  var prefix = isAbsence ? "ABS-" : "ATT-";
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var randomPart = "";
  for (var i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + dateCompact + "-" + randomPart;
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
            message: "This employee already has an attendance check-in for today."
          };
        }

        // Conflict 2: Employee was recorded Absent, trying to check in
        if (isExistingAbsence && !isSubmittingAbsence) {
          return {
            hasConflict: true,
            message: "This employee has already been recorded as Absent for today."
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
 * Gets or creates the 'Attendance' sheet and safely executes header migration:
 * Migrates legacy 7-column sheets to the exact 9 required columns:
 * [Timestamp, Date, Time, Name, Status, Reason, Notes, Source, Unique Entry ID]
 * 
 * Preserves all existing records:
 * - Existing normal records get Status = 'Present', Reason = '', Notes = ''
 * - Existing Source and Unique Entry ID are preserved in columns H and I.
 * - Does not delete, clear, or recreate the sheet.
 */
function getOrCreateSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  return ensureAttendanceHeaders(sheet);
}

/**
 * Ensures the Attendance sheet has the exact 9-column headers.
 */
function ensureAttendanceHeaders(sheet) {
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

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  // If empty sheet
  if (lastRow === 0 || lastCol === 0) {
    sheet.appendRow(REQUIRED_HEADERS);
    var hRange = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length);
    hRange.setFontWeight("bold");
    hRange.setBackground("#F3F4F6");
    hRange.setFontColor("#111827");
    sheet.setFrozenRows(1);
    for (var c = 1; c <= REQUIRED_HEADERS.length; c++) {
      sheet.autoResizeColumn(c);
    }
    return sheet;
  }

  // Read current row 1 headers
  var currentHeaders = sheet.getRange(1, 1, 1, Math.max(lastCol, REQUIRED_HEADERS.length)).getValues()[0];
  var colE = (currentHeaders[4] || "").toString().trim().toLowerCase();
  var colF = (currentHeaders[5] || "").toString().trim().toLowerCase();
  var colG = (currentHeaders[6] || "").toString().trim().toLowerCase();
  var colH = (currentHeaders[7] || "").toString().trim().toLowerCase();
  var colI = (currentHeaders[8] || "").toString().trim().toLowerCase();

  var isAlreadyMigrated = (
    colE === "status" &&
    colF === "reason" &&
    colG === "notes" &&
    colH === "source" &&
    colI === "unique entry id" &&
    lastCol >= 9
  );

  if (isAlreadyMigrated) {
    return sheet;
  }

  Logger.log("Migrating Attendance worksheet from legacy structure to 9 required columns...");

  // If there are existing data rows (lastRow >= 2)
  if (lastRow >= 2) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    var oldValues = dataRange.getValues();
    var migratedRows = [];

    for (var r = 0; r < oldValues.length; r++) {
      var row = oldValues[r];
      var valTimestamp = row[0] || "";
      var valDate = row[1] || "";
      var valTime = row[2] || "";
      var valName = row[3] || "";
      
      var oldCol5 = (row[4] || "").toString().trim();
      var oldCol6 = (row[5] || "").toString().trim();
      var oldCol7 = (row[6] || "").toString().trim();
      var oldCol8 = (row[7] || "").toString().trim();
      var oldCol9 = (row[8] || "").toString().trim();

      var valStatus = "Present";
      var valReason = "";
      var valNotes = "";
      var valSource = "Reception QR";
      var valUniqueId = "";

      if (oldCol5.toLowerCase() === "absent") {
        valStatus = "Absent";
        valReason = oldCol6;
        valNotes = oldCol7;
        valSource = oldCol8 || "Reception QR";
        valUniqueId = oldCol9;
      } else if (oldCol5.toLowerCase() === "present") {
        valStatus = "Present";
        valReason = oldCol6 || "";
        valNotes = oldCol7 || "";
        valSource = oldCol8 || "Reception QR";
        valUniqueId = oldCol9;
      } else {
        // Legacy 7-column format: [Timestamp, Date, Time, Name, Check-In Type, Source, Unique Entry ID]
        valStatus = "Present";
        valReason = "";
        valNotes = "";
        valSource = oldCol6 || "Reception QR";
        valUniqueId = oldCol7 || "";
      }

      migratedRows.push([
        valTimestamp,
        valDate,
        valTime,
        valName,
        valStatus,
        valReason,
        valNotes,
        valSource,
        valUniqueId
      ]);
    }

    // Set updated header row and data rows
    sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
    sheet.getRange(2, 1, migratedRows.length, REQUIRED_HEADERS.length).setValues(migratedRows);

  } else {
    // Only header row exists
    sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
  }

  // Format header row
  var headerRange = sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#F3F4F6");
  headerRange.setFontColor("#111827");
  sheet.setFrozenRows(1);

  for (var col = 1; col <= REQUIRED_HEADERS.length; col++) {
    sheet.autoResizeColumn(col);
  }

  Logger.log("Migration complete. Safely preserved " + (lastRow >= 2 ? (lastRow - 1) : 0) + " records.");
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

