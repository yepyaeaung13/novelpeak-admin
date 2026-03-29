import axiosClient from "@/lib/axios";

export const uploadImage = async (file: File) => {
  const form = new FormData();
  form.append("file", file);

  const res = await axiosClient.post("/v1/common/upload", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};
