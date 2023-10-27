"use client";

import { BroadcastBanner } from "@/components/BroadcastBanner";
import { Footer } from "@/components/Footer";
import Image from "next/image";
import { useAuth } from "@/components/context/auth.context";
import { constructTxUrl, getWalletUrl, sendTxUrl } from "@/utils/urls";
import { browserInit } from "@turnkey/http";
import {
  TSignRawPayloadInput,
  signSignRawPayload,
} from "@turnkey/http/dist/__generated__/services/coordinator/public/v1/public_api.fetcher";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import useSWR from "swr";
import { AuthWidget } from "@/components/AuthWidget";
import { History } from "@/components/History";

browserInit({
  baseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
});

type resource = {
  data: any;
};

type sendFormData = {
  destination: string;
  amount: string;
};

async function resourceFetcher(url: string): Promise<resource> {
  let response = await axios.get(url, { withCredentials: true });
  if (response.status === 200) {
    return {
      data: response.data,
    };
  } else {
    // Other status codes indicate an error of some sort
    return {
      data: {},
    };
  }
}

export default function Dashboard() {
  const { state } = useAuth();
  const [disabledSend, setDisabledSend] = useState(false);
  const [txHash, setTxHash] = useState("");

  const router = useRouter();
  const { register: sendFormRegister, handleSubmit: sendFormSubmit } =
    useForm<sendFormData>();

  const { data: key, error: keyError } = useSWR(
    getWalletUrl(),
    resourceFetcher,
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    if (state.isLoaded === true && state.isLoggedIn === false) {
      // Redirect the user to auth if not logged in
      router.push("/auth");
      return;
    }
  }, [state, router]);

  useEffect(() => {
    if (key && key.data && key.data["balance"] === "0.00") {
      setDisabledSend(true);
    } else {
      setDisabledSend(false);
    }
  }, [key, setDisabledSend]);

  async function sendFormHandler(data: sendFormData) {
    setDisabledSend(true);

    const constructRes = await axios.post(
      constructTxUrl(),
      {
        amount: data.amount,
        destination: data.destination,
      },
      { withCredentials: true }
    );

    if (constructRes.status === 200) {
    } else {
      const msg = `Unexpected response: ${constructRes.status}: ${constructRes.data}`;
      console.error(msg);
      alert(msg);
      setDisabledSend(false);
      return;
    }

    // Now let's sign this!
    const signTransactionInput: TSignRawPayloadInput = {
      body: {
        type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD",
        organizationId: constructRes.data["organizationId"],
        timestampMs: String(Date.now()), // millisecond timestamp
        parameters: {
          privateKeyId: constructRes.data["privateKeyId"],
          payload: constructRes.data["unsignedTransaction"],
          encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
          hashFunction: "HASH_FUNCTION_NO_OP",
        },
      },
    };
    const signedRequest = await signSignRawPayload(signTransactionInput);

    const sendRes = await axios.post(
      sendTxUrl(),
      {
        signedTxnRequest: signedRequest,
        transactionIntentId: constructRes.data["transactionIntentId"],
      },
      { withCredentials: true }
    );

    if (sendRes.status === 200) {
      console.log("Successfully sent! Hash", sendRes.data["hash"]);
      setTxHash(sendRes.data["hash"]);
    } else {
      const msg = `Unexpected response: ${sendRes.status}: ${sendRes.data}`;
      console.error(msg);
      alert(msg);
      setDisabledSend(false);
      return;
    }
    setDisabledSend(false);
  }

  if (keyError) {
    console.error("failed to load wallet information:", keyError);
  }

  return (
    <div>
      <header className="bg-zinc-900 p-4 px-8">
        <div className="grid grid-cols-3 flex-none mb-2">
          <div className="col-span-2 mt-4">
            <Image
              className={`inline-block invert`}
              src="/turnkey_logo_black.svg"
              alt="Turnkey"
              width={110}
              height={30}
              priority
            />
            <Image
              className={`inline-block invert my-12 mx-8`}
              src="/openfort_logo_black.svg"
              alt="->"
              width={110}
              height={30}
              priority
            />
          </div>

          <div className="col-span-1">
            <AuthWidget></AuthWidget>
          </div>
        </div>

        <h1 className="favorit text-5xl mt-2 mb-2 text-white">
          Demo passkey wallet
        </h1>
      </header>
      <div className="max-w-5xl mx-auto">
        <BroadcastBanner
          txHash={txHash}
          setTxHash={setTxHash}
        ></BroadcastBanner>

        <section className="lg:bg-subtle-accent p-8 lg:mt-16 lg:border border-zinc-300 divide-y divide-zinc-300">
          <div className="grid grid-cols-5 gap-8 mb-8">
            <div className="col-span-5 lg:col-span-2">
              <h3 className="text-3xl font-medium favorit mb-4">Your wallet</h3>
              <p className="text-destructive-red text-sm mt-1">
                This address is for demo purposes only. Anything sent to this
                address may be lost permanently.
              </p>
            </div>

            <div className="col-span-5 lg:col-span-3 sm:col-span-5">
              <p className="mb-4">
                <span className="font-semibold mr-2">Address:</span>
                <span className="font-mono">{key && key.data["address"]}</span>
                <br />
                {key ? (
                  <Link
                    className="text-indigo-600 cursor-pointer underline"
                    target="_blank"
                    href={
                      "https://mumbai.polygonscan.com/address/" +
                      key.data["address"]
                    }
                  >
                    View on Polyscan{" "}
                    <Image
                      className={`inline-block`}
                      src="/arrow.svg"
                      alt="->"
                      width={20}
                      height={20}
                      priority
                    />
                  </Link>
                ) : null}
              </p>
            </div>
          </div>

          <form
            action="#"
            method="POST"
            onSubmit={sendFormSubmit(sendFormHandler)}
          >
            <div className="grid grid-cols-5 gap-8">
              <div className="col-span-5 lg:col-span-2">
                <h3 className="text-3xl font-medium favorit mt-2 mb-4">
                  Action
                </h3>
              </div>

              <div className="col-span-5 lg:col-span-3 mt-2 rounded-sm flex h-fit">
                <button
                  type="submit"
                  disabled={disabledSend}
                  className="block flex-none ml-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:hover:bg-zinc-900 disabled:opacity-75"
                >
                  Mint NFT
                </button>
              </div>
            </div>
          </form>
        </section>

        <History></History>

        <div className="text-zinc-500 text-center font-semibold mt-12">
          <Link
            className="underline hover:font-bold"
            target="_blank"
            href={"https://docs.turnkey.com/getting-started/sub-organizations"}
            title="Ready to build?"
          >
            Turnkey Docs
          </Link>{" "}
          <Link
            className="underline hover:font-bold"
            target="_blank"
            href={"https://openfort.xyz/docs"}
            title="Ready to build?"
          >
            Openfort Docs
          </Link>
        </div>

        <Footer></Footer>
      </div>
    </div>
  );
}
