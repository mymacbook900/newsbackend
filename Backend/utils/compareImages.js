import Tesseract from "tesseract.js";

const normalize = (str) =>
  str
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const extractNameAndDOB = async (imagePath) => {
  const { data } = await Tesseract.recognize(imagePath, "eng+hin");

  const rawText = data.text;
  const text = normalize(rawText);

  // ✅ DOB (handles spaces, /, -)
  const dobMatch = text.match(
    /(dob|date of birth|जन्म तिथि|जन्मतिथि)\s*[:\-]?\s*(\d{2}\s*[\/\-]\s*\d{2}\s*[\/\-]\s*\d{4})/
  );

  // ✅ NAME (after "name" keyword)
  const nameMatch = rawText.match(
    /(name|नाम)\s*[:\-]?\s*([A-Za-z ]{3,})/i
  );

  return {
    name: nameMatch ? normalize(nameMatch[2]) : "",
    dob: dobMatch ? dobMatch[2].replace(/\s/g, "") : ""
  };
};

export default extractNameAndDOB;
