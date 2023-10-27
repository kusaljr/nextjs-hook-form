"use server";

import { getValidatedFormData } from "@/components/next-form.server";
import { validationSchema } from "@/schema/user.schema";

export async function create(formData: FormData) {
  const { data, errors, receivedValues } = await getValidatedFormData(
    formData,
    validationSchema
  );

  if (errors) throw new Error("Something went wrong!");

  console.log(receivedValues);

  return "ok";
}
