import { ZodError, z } from "zod";

const tryParseJSON = (jsonString: string) => {
  try {
    const json = JSON.parse(jsonString);
    return json;
  } catch (e) {
    return jsonString;
  }
};

export const generateFormData = (
  formData: FormData,
  preserveStringified = false
) => {
  // Initialize an empty output object.
  const outputObject: Record<any, any> = {};

  // Iterate through each key-value pair in the form data.
  for (const [key, value] of formData.entries()) {
    // Try to convert data to the original type, otherwise return the original value
    const data = preserveStringified ? value : tryParseJSON(value.toString());
    // Split the key into an array of parts.
    const keyParts = key.split(".");
    // Initialize a variable to point to the current object in the output object.
    let currentObject = outputObject;

    // Iterate through each key part except for the last one.
    for (let i = 0; i < keyParts.length - 1; i++) {
      // Get the current key part.
      const keyPart = keyParts[i];
      // If the current object doesn't have a property with the current key part,
      // initialize it as an object or array depending on whether the next key part is a valid integer index or not.
      if (!currentObject[keyPart]) {
        currentObject[keyPart] = /^\d+$/.test(keyParts[i + 1]) ? [] : {};
      }
      // Move the current object pointer to the next level of the output object.
      currentObject = currentObject[keyPart];
    }

    // Get the last key part.
    const lastKeyPart = keyParts[keyParts.length - 1];
    const lastKeyPartIsArray = /\[\d*\]$|\[\]$/.test(lastKeyPart);

    // Handles array[] or array[0] cases
    if (lastKeyPartIsArray) {
      const key = lastKeyPart.replace(/\[\d*\]$|\[\]$/, "");
      if (!currentObject[key]) {
        currentObject[key] = [];
      }

      currentObject[key].push(data);
    }

    // Handles array.foo.0 cases
    if (!lastKeyPartIsArray) {
      // If the last key part is a valid integer index, push the value to the current array.
      if (/^\d+$/.test(lastKeyPart)) {
        currentObject.push(data);
      }
      // Otherwise, set a property on the current object with the last key part and the corresponding value.
      else {
        currentObject[lastKeyPart] = data;
      }
    }
  }

  // Return the output object.
  return outputObject;
};
const parseFormData = async <T extends any>(
  formData: FormData,
  preserveStringified = false
): Promise<T> => {
  return generateFormData(formData, preserveStringified);
};

function validateWithZodSchema<T>(
  schema: z.ZodType<T>,
  jsonData: Awaited<T>
): {
  isValid: boolean;
  data: T | null;
  validationErrors: ZodError | null;
} {
  let validationErrors: ZodError | null = null;

  try {
    const parsedDataValidation = schema.safeParse(jsonData);

    if (!parsedDataValidation.success) {
      validationErrors = parsedDataValidation.error;
    }
  } catch (error) {
    validationErrors = new ZodError([]); // Empty ZodError in case of parsing failure
  }

  return {
    isValid: validationErrors === null,
    data: jsonData,
    validationErrors,
  };
}

export const getValidatedFormData = async <T>(
  formdata: FormData,
  validationSchema: z.ZodType<T>
) => {
  const data = await parseFormData(formdata);
  const validatedOutput = validateWithZodSchema(validationSchema, data);
  return {
    receivedValues: data,
    data: validatedOutput.data,
    isValid: validatedOutput.isValid,
    errors: validatedOutput.validationErrors,
  };
};
