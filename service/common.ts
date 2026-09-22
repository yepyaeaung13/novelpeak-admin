import axiosClient from "@/lib/axios";

export const uploadImage = async (file: File) => {
  const form = new FormData();
  form.append("image", file);

  const res = await axiosClient.post(
    "/books/upload",
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return res.data;
};
