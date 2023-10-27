"use server";

import { getValidatedFormData } from "@/components/next-form.server";
import { validationSchema } from "@/schema/user.schema";

export async function create(formData: FormData) {
  const { receivedValues } = await getValidatedFormData(
    formData,
    validationSchema
  );

  console.log(receivedValues);

  return "ok";
}
