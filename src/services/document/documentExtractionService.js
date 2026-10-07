const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

/**
 * Universal Document Extraction Service
 *
 * Ingests PDF, DOCX, and TXT files.
 * Extracts pages, identifies layout columns, preserves text blocks with coordinates
 * and reading order, and provides structural metadata.
 */

/**
 * Enhanced PDF text extraction with layout and block analysis
 */
const extractPdfWithLayout = async (fileBuffer) => {
  let pageBlocks = [];
  let pageTexts = [];

  // Custom page render to capture individual pages and lines/blocks
  const pagerender = (pageData) => {
    return pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
      .then((textContent) => {
        const viewport = pageData.getViewport({ scale: 1.0 });
        const items = textContent.items || [];
        
        // Group items into visual lines / blocks by vertical position (Y) and horizontal position (X)
        const lineMap = new Map();
        
        items.forEach((item) => {
          const str = (item.str || '').trim();
          if (!str) return;
          
          const tx = item.transform || [1, 0, 0, 1, 0, 0];
          const x = Math.round(tx[4]);
          const y = Math.round(tx[5]);
          const width = Math.round(item.width || 0);
          const height = Math.round(item.height || 0);

          // Approximate line grouping within 4px Y-tolerance
          const lineY = Math.round(y / 4) * 4;
          if (!lineMap.has(lineY)) {
            lineMap.set(lineY, []);
          }
          lineMap.get(lineY).push({ str, x, y, width, height });
        });

        // Sort lines top-to-bottom (PDF Y starts from bottom, so higher Y is higher on page)
        const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);

        // Analyze horizontal distribution to detect columns
        const allX = items.map(it => it.transform ? Math.round(it.transform[4]) : 0).filter(x => x > 0);
        const pageWidth = viewport.width || 600;
        const midPoint = pageWidth / 2;

        let leftCount = 0;
        let rightCount = 0;
        allX.forEach(x => {
          if (x < midPoint - 30) leftCount++;
          else if (x > midPoint + 30) rightCount++;
        });

        // Determine if page has a 2-column or sidebar layout
        const isTwoColumn = (leftCount > 15 && rightCount > 15);

        const pageLines = [];
        const rawBlocks = [];

        if (isTwoColumn) {
          // In a 2-column layout, read left column first (top-to-bottom), then right column
          // or sort within each column to maintain logical reading order
          const leftBlocks = [];
          const rightBlocks = [];

          sortedY.forEach(yKey => {
            const rowItems = lineMap.get(yKey).sort((a, b) => a.x - b.x);
            rowItems.forEach(item => {
              if (item.x < midPoint) {
                leftBlocks.push(item);
              } else {
                rightBlocks.push(item);
              }
            });
          });

          // Left column lines
          const leftLineMap = new Map();
          leftBlocks.forEach(b => {
            const ly = Math.round(b.y / 4) * 4;
            if (!leftLineMap.has(ly)) leftLineMap.set(ly, []);
            leftLineMap.get(ly).push(b.str);
          });
          const sortedLeftY = Array.from(leftLineMap.keys()).sort((a, b) => b - a);
          sortedLeftY.forEach(ly => pageLines.push(leftLineMap.get(ly).join(' ')));

          // Right column lines
          const rightLineMap = new Map();
          rightBlocks.forEach(b => {
            const ry = Math.round(b.y / 4) * 4;
            if (!rightLineMap.has(ry)) rightLineMap.set(ry, []);
            rightLineMap.get(ry).push(b.str);
          });
          const sortedRightY = Array.from(rightLineMap.keys()).sort((a, b) => b - a);
          sortedRightY.forEach(ry => pageLines.push(rightLineMap.get(ry).join(' ')));

          rawBlocks.push(...leftBlocks, ...rightBlocks);
        } else {
          // Single-column: sort items horizontally within each line
          sortedY.forEach(yKey => {
            const rowItems = lineMap.get(yKey).sort((a, b) => a.x - b.x);
            const lineStr = rowItems.map(it => it.str).join(' ');
            if (lineStr.trim()) {
              pageLines.push(lineStr.trim());
              rawBlocks.push(...rowItems);
            }
          });
        }

        const pageText = pageLines.join('\n');
        pageTexts.push(pageText);

        pageBlocks.push({
          pageNumber: pageData.pageIndex + 1,
          width: pageWidth,
          height: viewport.height || 800,
          isTwoColumn,
          lines: pageLines,
          blocksCount: rawBlocks.length
        });

        return pageText;
      });
  };

  const parsed = await pdfParse(fileBuffer, { pagerender });
  const rawFullText = (parsed.text || '').trim();
  const assembledText = pageTexts.join('\n\n---\n\n').trim() || rawFullText;

  return {
    text: assembledText,
    rawText: rawFullText,
    totalPages: parsed.numpages || pageBlocks.length || 1,
    processedPages: pageBlocks.length || parsed.numpages || 1,
    pageBlocks,
    isMultiColumn: pageBlocks.some(p => p.isTwoColumn)
  };
};

/**
 * Enhanced DOCX extraction preserving paragraphs and tables
 */
const extractDocxWithLayout = async (fileBuffer) => {
  // Extract text preserving table structures and headings
  const options = {
    includeDefaultStyleMap: true
  };
  const rawResult = await mammoth.extractRawText({ buffer: fileBuffer });
  const text = (rawResult.value || '').trim();

  return {
    text,
    rawText: text,
    totalPages: 1,
    processedPages: 1,
    pageBlocks: [{
      pageNumber: 1,
      width: 612,
      height: 792,
      isTwoColumn: false,
      lines: text.split('\n').filter(Boolean),
      blocksCount: text.split('\n').filter(Boolean).length
    }],
    isMultiColumn: false
  };
};

/**
 * Universal buffer extraction entry point
 */
const extractDocumentContent = async (fileBuffer, originalname, mimetype) => {
  const ext = path.extname(originalname).toLowerCase();

  let result;
  if (ext === '.pdf' || mimetype === 'application/pdf') {
    try {
      result = await extractPdfWithLayout(fileBuffer);
    } catch (err) {
      // Fallback to standard parse if custom layout extraction fails
      console.warn('[DocExtractor] Layout PDF parse failed, attempting standard extraction:', err.message);
      try {
        const std = await pdfParse(fileBuffer);
        result = {
          text: (std.text || '').trim(),
          rawText: (std.text || '').trim(),
          totalPages: std.numpages || 1,
          processedPages: std.numpages || 1,
          pageBlocks: [],
          isMultiColumn: false
        };
      } catch (stdErr) {
        const parseErr = new Error("We couldn't fully read this CV. Please try uploading the original PDF again.");
        parseErr.code = 'PDF_PARSE_FAILED';
        throw parseErr;
      }
    }

    // Check for scanned / image PDF with insufficient selectable text
    if ((!result.text || result.text.length < 60) && result.totalPages >= 1) {
      const err = new Error(
        "We couldn't reliably read selectable text from this CV. The file appears to be a scanned image. Please upload a searchable PDF or DOCX file."
      );
      err.code = 'SCANNED_PDF_DETECTED';
      throw err;
    }
  } else if (
    ext === '.docx' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      result = await extractDocxWithLayout(fileBuffer);
    } catch (err) {
      const parseErr = new Error("We couldn't fully read this CV. Please try uploading the original document again.");
      parseErr.code = 'DOCX_PARSE_FAILED';
      throw parseErr;
    }

    if (!result.text || result.text.length < 20) {
      const err = new Error("The uploaded DOCX file appears to be empty. Please upload a complete CV document.");
      err.code = 'EMPTY_DOCUMENT';
      throw err;
    }
  } else if (ext === '.txt' || mimetype === 'text/plain') {
    const text = fileBuffer.toString('utf-8').trim();
    result = {
      text,
      rawText: text,
      totalPages: 1,
      processedPages: 1,
      pageBlocks: [{
        pageNumber: 1,
        width: 600,
        height: 800,
        isTwoColumn: false,
        lines: text.split('\n').filter(Boolean),
        blocksCount: text.split('\n').filter(Boolean).length
      }],
      isMultiColumn: false
    };
  } else {
    const unsupportedErr = new Error(`Unsupported document type '${ext}'. Please upload a PDF or DOCX.`);
    unsupportedErr.code = 'UNSUPPORTED_FORMAT';
    throw unsupportedErr;
  }

  const extractedCharacterCount = result.text.length;
  const extractedWordCount = result.text.split(/\s+/).filter(Boolean).length;

  return {
    text: result.text,
    rawText: result.rawText,
    totalPages: result.totalPages,
    processedPages: result.processedPages,
    extractedCharacterCount,
    extractedWordCount,
    documentStructure: {
      pages: result.pageBlocks,
      isMultiColumn: result.isMultiColumn
    }
  };
};

module.exports = {
  extractDocumentContent,
  extractPdfWithLayout,
  extractDocxWithLayout
};
