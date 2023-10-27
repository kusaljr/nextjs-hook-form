import React from "react";
import {
  DeepPartial,
  DeepRequired,
  FieldErrors,
  FieldErrorsImpl,
  FieldValues,
  Path,
  RegisterOptions,
  Resolver,
  SubmitErrorHandler,
  SubmitHandler,
  UseFormProps,
  useForm,
} from "react-hook-form";

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
export const validateFormData = async <T extends FieldValues>(
  data: any,
  resolver: Resolver
) => {
  const { errors, values } = await resolver(
    data,
    {},
    { shouldUseNativeValidation: false, fields: {} }
  );

  if (Object.keys(errors).length > 0) {
    return { errors: errors as FieldErrors<T>, data: undefined };
  }

  return { errors: undefined, data: values as T };
};
export const parseFormData = async <T extends any>(
  formData: FormData,
  preserveStringified = false
): Promise<T> => {
  return generateFormData(formData, preserveStringified);
};

export const getValidatedFormData = async <T extends FieldValues>(
  formdata: FormData,
  resolver: Resolver
) => {
  const data = await parseFormData<T>(formdata);

  const validatedOutput = await validateFormData<T>(data, resolver);
  return { ...validatedOutput, receivedValues: data };
};

export const mergeErrors = <T extends FieldValues>(
  frontendErrors: Partial<FieldErrorsImpl<DeepRequired<T>>>,
  backendErrors?: Partial<FieldErrorsImpl<DeepRequired<T>>>,
  validKeys: string[] = [],
  depth = 0
) => {
  if (!backendErrors) {
    return frontendErrors;
  }

  for (const [key, rightValue] of Object.entries(backendErrors) as [
    keyof T,
    DeepRequired<T>[keyof T]
  ][]) {
    if (
      !validKeys.includes(key.toString()) &&
      validKeys.length &&
      depth === 0
    ) {
      continue;
    }
    if (typeof rightValue === "object" && !Array.isArray(rightValue)) {
      if (!frontendErrors[key]) {
        frontendErrors[key] = {} as DeepRequired<T>[keyof T];
      }
      mergeErrors(frontendErrors[key]!, rightValue, validKeys, depth + 1);
    } else if (rightValue) {
      frontendErrors[key] = rightValue;
    }
  }

  return frontendErrors;
};

export interface UseNextFormOptions<T extends FieldValues>
  extends UseFormProps<T> {
  submitHandlers?: {
    onValid?: SubmitHandler<T>;
    onInvalid: SubmitErrorHandler<T>;
  };
  submitConfig?: any;
  submitData?: FieldValues;
  serverFunction: (formdata: FormData) => void;
}

export const createFormData = <T extends FieldValues>(data: T): FormData => {
  const formData = new FormData();
  if (!data) {
    return formData;
  }
  Object.entries(data).map(([key, value]) => {
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else if (value instanceof File) {
      formData.append(key, value);
    } else if (typeof value === "object" && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else if (typeof value === "boolean") {
      formData.append(key, value.toString());
    } else if (typeof value === "number") {
      formData.append(key, value.toString());
    } else {
      formData.append(key, value);
    }
  });

  return formData;
};

export const useNextForm = <T extends FieldValues>({
  submitHandlers,
  submitConfig,
  submitData,
  serverFunction,

  ...formProps
}: UseNextFormOptions<T>) => {
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] =
    React.useState(false);

  const methods = useForm<T>(formProps);

  const onSubmit = (data: T) => {
    setIsSubmittedSuccessfully(true);
    const formData = createFormData({ ...data, ...submitData });

    serverFunction(formData);
  };

  const formState = methods.formState;
  const values = methods.getValues();

  const validKeys = Object.keys(values);

  const onInvalid = () => {};

  const {
    dirtyFields,
    isDirty,
    isSubmitSuccessful,
    isSubmitted,
    isSubmitting,
    isValid,
    isValidating,
    touchedFields,
    submitCount,
    errors,
    isLoading,
  } = formState;

  const formErrors = mergeErrors<T>(errors, undefined, validKeys);
  return {
    ...methods,
    handleSubmit: methods.handleSubmit(
      submitHandlers?.onValid ?? onSubmit,
      submitHandlers?.onInvalid ?? onInvalid
    ),
    reset: (values?: T | DeepPartial<T> | undefined) => {
      setIsSubmittedSuccessfully(false);
      methods.reset(values as any);
    },
    register: (
      name: Path<T>,
      options?: RegisterOptions<T> & {
        disableProgressiveEnhancement?: boolean;
      }
    ) => ({
      ...methods.register(name, options),
    }),
    formState: {
      dirtyFields,
      isDirty,
      isSubmitSuccessful: isSubmittedSuccessfully || isSubmitSuccessful,
      isSubmitted,
      isValid,
      isValidating,
      touchedFields,
      submitCount,
      isLoading,
      errors: formErrors,
    },
  };
};
