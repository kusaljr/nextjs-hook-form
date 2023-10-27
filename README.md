## Next JS and React hook form implementation in server component

### Example

```javascript
export default function App() {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useNextForm <
  ValidationSchema >
  {
    serverFunction: create,
    resolver: zodResolver(validationSchema),
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="firstName">First Name</label>
        <input
          id="firstName"
          type="text"
          placeholder="First Name"
          {...register("firstName")}
        />
        {errors.firstName && <p>{errors.firstName?.message}</p>}

        <button type="submit">Register Account</button>
      </div>
    </form>
  );
}
```

```javascript
export async function create(formData: FormData) {
  const { data, errors, receivedValues } = await getValidatedFormData(
    formData,
    validationSchema
  );

  if (errors) throw new Error("Something went wrong!");

  console.log(receivedValues);

  return "ok";
}
```
