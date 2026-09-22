import axiosClient, { isLocalApi } from "@/lib/axios";

export const uploadImage = async (file: File) => {
  const form = new FormData();
  form.append(isLocalApi ? "image" : "file", file);

  const res = await axiosClient.post(
    isLocalApi ? "/books/upload" : "/v1/common/upload",
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return res.data;
};
