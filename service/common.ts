import axiosClient, { isOakApi } from "@/lib/axios";

export const uploadImage = async (file: File) => {
  const form = new FormData();
  form.append(isOakApi ? "image" : "file", file);

  const res = await axiosClient.post(
    isOakApi ? "/books/upload" : "/v1/common/upload",
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return res.data;
};
