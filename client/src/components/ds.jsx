import React, { useState, useRef } from "react";
import {
  FileText,
  Send,
  Loader2,
  AlertCircle,
  Download,
  X,
  Database,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const SimpleMedicalExtractor = () => {
  const [medicalText, setMedicalText] = useState("");
  const [rawOutput, setRawOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isCached, setIsCached] = useState(false);

  const outputRef = useRef(null); //outputRef is a ref to the output element

  // Sample medical text for demo
  const sampleText = `The patient, Mr. Ramesh Verma, a 62-year-old male, was admitted to the hospital on April 10, 2025, with complaints of chest pain radiating to the left arm, shortness of breath on exertion, and sweating. He is a known case of hypertension and type 2 diabetes mellitus for the past 10 years. He underwent cholecystectomy 5 years ago.

On examination, he had elevated blood pressure (160/100 mmHg), tachycardia (pulse 108 bpm), and reduced air entry on the left lower lung fields. ECG showed ST elevation in leads II, III, and aVF. Cardiac enzymes (troponin I) were elevated. He was diagnosed with acute inferior wall myocardial infarction.

On the day of admission, Dr. S. P. Rath initiated treatment with antiplatelets (aspirin 150 mg and clopidogrel 75 mg), atorvastatin 40 mg, and subcutaneous enoxaparin. He was transferred to the ICU for continuous cardiac monitoring. A coronary angiogram was performed on April 11 by Dr. Ashok Nanda, revealing 90% stenosis in the right coronary artery.

On April 12, percutaneous coronary intervention (PCI) with stent placement was successfully done. The procedure was uneventful. Post-PCI, the patient was continued on dual antiplatelet therapy, beta-blockers (metoprolol 25 mg twice daily), and ACE inhibitors (ramipril 5 mg once daily). Blood sugar was managed with insulin sliding scale.

During hospitalization, he also developed mild hypokalemia which was corrected with oral potassium chloride. He gradually improved, and by April 16, he was ambulatory and hemodynamically stable. Pulmonary evaluation showed resolution of initial basal crepitations.

He was discharged on April 17, 2025, in stable condition. He was advised regular follow-up with cardiology, to monitor blood pressure, sugar levels, and serum electrolytes. Lifestyle modifications including low-sodium and diabetic diet, daily walking, smoking cessation, and medication adherence were advised.

Discharge medications included aspirin 75 mg daily, clopidogrel 75 mg daily, atorvastatin 40 mg at night, metoprolol 25 mg twice daily, ramipril 5 mg daily, and insulin as per sliding scale.`;

  const handleSubmit = async () => {
    if (!medicalText.trim()) {
      setError("Please enter medical text");
      return;
    }

    setLoading(true);
    setError("");
    setRawOutput("");
    setIsCached(false);
    const startTime = performance.now();

    try {
      const response = await fetch("http://localhost:8000/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medical_text: medicalText,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();

      if (result.raw_llama_output) {
        setRawOutput(result.raw_llama_output);
        setShowModal(true);
        // Check if response was from cache by comparing response time
        // If response time is very fast (less than 100ms), it's likely from cache
        const responseTime = performance.now() - startTime;
        setIsCached(responseTime < 100);
      } else {
        setRawOutput(JSON.stringify(result, null, 2));
        setShowModal(true);
      }
    } catch (err) {
      console.error("Error:", err);
      if (err.message.includes("Failed to fetch")) {
        setError(
          "Connection error. Make sure the backend server is running on port 8000."
        );
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setMedicalText(sampleText); //medicalText=sampleText
    setError("");
    setRawOutput("");
  };

  const handleDownload = async () => {
    if (!rawOutput) {
      setError("No output to download");
      return;
    }

    try {
      // Get the output element
      const element = outputRef.current;
      if (!element) {
        setError("Could not find output element");
        return;
      }

      console.log("Starting PDF generation...");

      // Create a canvas from the element
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: true, // Enable logging for debugging
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          // Ensure the cloned element is visible and properly styled
          const clonedElement = clonedDoc.querySelector("pre");
          if (clonedElement) {
            clonedElement.style.height = "auto";
            clonedElement.style.maxHeight = "none";
            clonedElement.style.overflow = "visible";
            clonedElement.style.backgroundColor = "#f9fafb"; // bg-gray-50
            clonedElement.style.color = "#374151"; // text-gray-700
            clonedElement.style.fontFamily = "monospace";
            clonedElement.style.padding = "1.5rem";
            clonedElement.style.borderRadius = "0.5rem";
          }

          // Style the inner content
          const innerDiv = clonedElement?.querySelector("div");
          if (innerDiv) {
            // Style spans
            innerDiv.querySelectorAll("span").forEach((span) => {
              span.style.fontWeight = "600";
              span.style.color = "#2563eb"; // text-blue-600
              span.style.backgroundColor = "#eff6ff"; // bg-blue-50
              span.style.padding = "0.375rem 0.75rem";
              span.style.borderRadius = "0.25rem";
            });

            // Style headers
            innerDiv.querySelectorAll("h2").forEach((h2) => {
              h2.style.fontSize = "1.5rem";
              h2.style.fontWeight = "700";
              h2.style.color = "#2563eb"; // text-blue-600
              h2.style.backgroundColor = "#eff6ff"; // bg-blue-50
              h2.style.padding = "0.5rem";
              h2.style.borderRadius = "0.25rem";
              h2.style.marginBottom = "1rem";
            });

            // Style divs
            innerDiv.querySelectorAll("div").forEach((div) => {
              div.style.border = "1px solid #e5e7eb";
              div.style.borderRadius = "0.5rem";
              div.style.padding = "0.75rem";
              div.style.marginBottom = "0.75rem";
              div.style.backgroundColor = "#ffffff";
              div.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
            });
          }
        },
      });

      console.log(
        "Canvas created, dimensions:",
        canvas.width,
        "x",
        canvas.height
      );

      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      console.log("Creating PDF with dimensions:", imgWidth, "x", imgHeight);

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      console.log("PDF generated successfully");

      // Save the PDF
      pdf.save(`medical_record_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError(`Failed to generate PDF: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-500 p-3 rounded-full shadow-md">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-700 ml-4">
              Simple Medical Record Extractor
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Enter medical text and get raw AI output
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-xl shadow-md p-8 transform transition-all hover:shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-700 flex items-center">
                <FileText className="h-5 w-5 text-blue-500 mr-2" />
                Medical Text Input
              </h2>
              <button
                onClick={loadSample}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center border border-gray-200"
              >
                <FileText className="h-4 w-4 mr-2" />
                Load Sample
              </button>
            </div>

            <textarea
              value={medicalText}
              onChange={(e) => setMedicalText(e.target.value)} //medicalText=e.target.value
              placeholder="Enter medical notes here..."
              className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm bg-gray-50 text-gray-700 placeholder-gray-400"
            />

            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={loading || !medicalText.trim()} //loading=false,medicalText.trim()=true
                className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] font-medium shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Submit
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 flex items-center p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="bg-white rounded-xl shadow-md p-8 transform transition-all hover:shadow-lg border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-700 mb-6 flex items-center">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              Raw AI Output
            </h2>

            {!rawOutput && !loading && (
              <div className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-600 font-medium">No output yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Click Submit to see AI response
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="animate-spin h-10 w-10 mx-auto mb-3 text-blue-500" />
                  <p className="text-gray-600 font-medium">
                    Getting AI response...
                  </p>
                </div>
              </div>
            )}

            {rawOutput && (
              <div className="border border-gray-200 rounded-lg shadow-sm bg-gray-50">
                <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-blue-500" />
                    Raw Output from Llama3
                    {isCached && (
                      <span className="ml-2 flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        <Database className="h-3 w-3 mr-1" />
                        Cached
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowModal(true)}
                      className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <FileText className="h-4 w-4 mr-1.5" />
                      View Full Output
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      Download PDF
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <pre
                    ref={outputRef}
                    className="p-6 text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded-b-lg"
                    style={{
                      minHeight: "200px",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: rawOutput }}
                      style={{
                        "--tw-text-opacity": "1",
                        "--tw-bg-opacity": "1",
                      }}
                      className="[&_span]:font-semibold [&_span]:text-blue-600 [&_span]:bg-blue-50 [&_span]:px-1.5 [&_span]:py-0.5 [&_span]:rounded [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-blue-600 [&_h2]:mb-4 [&_h2]:bg-blue-50 [&_h2]:p-2 [&_h2]:rounded [&_div]:border [&_div]:border-gray-200 [&_div]:rounded-lg [&_div]:p-3 [&_div]:mb-3 [&_div]:bg-white [&_div]:shadow-sm"
                    />
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-700 flex items-center">
                <FileText className="h-5 w-5 text-blue-500 mr-2" />
                AI Response
                {isCached && (
                  <span className="ml-2 flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    <Database className="h-3 w-3 mr-1" />
                    Cached
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono [&_span]:font-semibold [&_span]:text-blue-600 [&_span]:bg-blue-50 [&_span]:px-1.5 [&_span]:py-0.5 [&_span]:rounded [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-blue-600 [&_h2]:mb-4 [&_h2]:bg-blue-50 [&_h2]:p-2 [&_h2]:rounded [&_div]:border [&_div]:border-gray-200 [&_div]:rounded-lg [&_div]:p-3 [&_div]:mb-3 [&_div]:bg-white [&_div]:shadow-sm">
                <div dangerouslySetInnerHTML={{ __html: rawOutput }} />
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleMedicalExtractor;
