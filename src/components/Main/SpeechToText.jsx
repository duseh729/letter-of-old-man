import axios from "axios";
import React, { useState, useEffect, useRef } from "react";

import postChat from "../../apis/eliceChat";

import {
  ChatAnswer,
  ChatAnswerContainer,
  ChatQuestion,
  ChatQuestionContainer,
} from "./SpeechToText.style";

import { ButtonContainer, ShadowButtonContainer } from "../Common.style";
import { COLOR } from "../../constants/color";

import soundImage from "../../images/SpeechToText/sound.png";
import logoWhiteImage from "../../images/SpeechToText/logo-white.png";
import textImage from "../../images/SpeechToText/text.png";
import soundLargeImage from "../../images/SpeechToText/sound-large.png";
import closeImage from "../../images/common/close.png";
import textWhiteImage from "../../images/SpeechToText/text-white.png";
import loadingImage from "../../images/SpeechToText/loading.png";

import { FONT } from "../../constants/font";
import googleSpeechToText from "../../apis/googleStt";
import { getChat, saveChat } from "../../apis/api/chat";
import getCurrentDate from "../../utils/getCurrentDate";
import { getNaverStt } from "../../apis/api/naverTts";
import { useRecoilState } from "recoil";
import { speakerIndexState } from "../../store/headerAtom";
import { getRecord } from "../../apis/api/record";
import eliceTts from "../../apis/eliceTts";

// Function to convert audio blob to base64 encoded string
const audioBlobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const arrayBuffer = reader.result;
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
      resolve(base64Audio);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
};

const base64ToBlob = (base64, mimeType) => {
  const byteCharacters = atob(base64); // Base64 디코딩
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
    const slice = byteCharacters.slice(offset, offset + 1024);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
};

// 예시: Base64 문자열을 .mp4로 변환
const convertBase64ToM4A = async (base64Audio) => {
  // 'audio/m4a' MIME 타입으로 Blob 생성
  const audioBlob = base64ToBlob(base64Audio, "audio/m4a");

  // File 객체로 변환 (파일명 지정)
  const audioFile = new File([audioBlob], "audio.m4a", { type: "audio/m4a" });

  return audioFile; // 파일 객체 반환
};

const playWavFromBase64 = (base64Audio) => {
  // Base64 문자열을 Blob으로 변환 (WAV 파일 MIME 타입)
  const audioBlob = base64ToBlob(base64Audio, "audio/wav");

  // Blob을 URL로 변환
  const audioURL = URL.createObjectURL(audioBlob);

  // <audio> 태그를 만들어서 재생
  const audioElement = new Audio(audioURL);
  audioElement.play(); // 재생 시작
};

const SpeechToText = () => {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [transcription, setTranscription] = useState([]);
  const [chatResult, setChatResult] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChat, setIsChat] = useState(false);
  const [chatText, setChatText] = useState("");
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [nowTtsIndex, setNowTtsIndex] = useState(0);

  const [speakerIndex, setSpeakerIndex] = useRecoilState(speakerIndexState);

  const messageEndRef = useRef(null);

  const firstQuestion = `안녕하세요. 무엇을 도와드릴까요?`;

  // 채팅 데이터 불러오기
  useEffect(() => {
    const currentDate = getCurrentDate();

    const fetchChatLog = async (date) => {
      const res = await getChat(date);
      // console.log(res);
      setTranscription(res.data.map((item) => item.question));
      setChatResult(res.data.map((item) => item.answer));
    };

    fetchChatLog(currentDate);
  }, []);

  // Cleanup function to stop recording and release media resources
  useEffect(() => {
    return () => {
      if (mediaRecorder) {
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaRecorder]);

  // 채팅 스크롤 맨 아래로 내리는 로직
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatResult, transcription]);

  const handlePlayTts = async (index, text, ttsIndex) => {
    // TTS 음성을 가져오고 재생
    setIsTtsLoading(true);
    setNowTtsIndex(ttsIndex);
    // console.log(nowTtsIndex);

    try {
      if (index == 0) {
        const myWav = await getRecord();
        // console.log(myWav);

        const mp4FileURL = await convertBase64ToM4A(myWav.data.audioData);
        // console.log(mp4FileURL);

        // eliceTts 함수 호출
        const response = await eliceTts(mp4FileURL, text);
        // console.log(response);
        const blob = new Blob([response.data]);

        // Blob을 ArrayBuffer로 변환
        blob
          .arrayBuffer()
          .then(function (arrayBuffer) {
            // console.log("arrayBuffer: ",arrayBuffer)
            const audioBlob = new Blob([arrayBuffer], { type: "audio/mp3" });

            // Blob을 URL로 변환하여 오디오 객체 생성
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            // 음성 파일 재생
            audio.play();
          })
          .catch(function (error) {
            console.error("Error converting Blob to ArrayBuffer:", error);
          });
      } else {
        const audio = await getNaverStt(index, text);
      }
    } catch (error) {
      throw new Error(`음성 재생 오류 : ${error}`);
    } finally {
      setIsTtsLoading(false);
    }

    // 음성이 끝날 때의 처리를 추가할 수 있음
    // audio.onended = () => {
    //   console.log("Audio has finished playing.");
    // };
  };

  const requestEliceChat = async (text) => {
    try {
      const chatResponse = await postChat(text);
      // console.log(chatResponse.data?.choices[0]?.message?.content)

      return chatResponse.data?.choices[0]?.message?.content;
    } catch (e) {
      return "죄송하지만 다시 요청해주세요.";
      throw new Error("엘리스 채팅 오류: ", e);
    }
  };

  const requestEliceChatResultHandler = (chat) => {
    setChatResult([...chatResult, chat]);
    setIsChatLoading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.start();
      // console.log('Recording started');

      // Event listener to handle data availability
      recorder.addEventListener("dataavailable", async (event) => {
        // console.log('Data available event triggered');
        const audioBlob = event.data;

        const base64Audio = await audioBlobToBase64(audioBlob);
        //console.log('Base64 audio:', base64Audio);

        try {
          const startTime = performance.now();

          const response = await googleSpeechToText(base64Audio);

          const endTime = performance.now();
          const elapsedTime = endTime - startTime;

          //console.log('API response:', response);
          // console.log("Time taken (ms):", elapsedTime);

          if (response.data.results && response.data.results.length > 0) {
            const tts = response.data.results[0].alternatives[0].transcript;
            // console.log(tts);
            setTranscription([...transcription, tts]);
            setIsChatLoading(true);

            try {
              const chatResponse = await requestEliceChat(tts);

              requestEliceChatResultHandler(chatResponse);

              const res = await saveChat({
                question: tts,
                answer: chatResponse,
              });
            } catch (error) {
              requestEliceChatResultHandler(`tts save chat Error: ${error}`);
            }
          } else {
            console.log(
              "No transcription results in the API response:",
              response.data
            );
            setTranscription([
              ...transcription,
              "녹음이 실패했습니다.\n다시 시도해주세요.",
            ]);
          }
        } catch (error) {
          console.error("Error with Google Speech-to-Text API:", error);
        }
      });

      setRecording(true);
      setMediaRecorder(recorder);
    } catch (error) {
      console.error("Error getting user media:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      // console.log('Recording stopped');
      setRecording(false);
    }
  };

  const ttsHandler = (text) => {
    const tts = new SpeechSynthesisUtterance(text);
    tts.rate = 2;
    tts.pitch = 0.5;
    window.speechSynthesis.speak(tts);
  };

  const mode4 = (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "calc(100vh - 73px)",
      }}
    >
      {/* 채팅 영역 */}
      <div style={{ overflow: "auto" }}>
        {/* 처음 질문 */}
        <ChatAnswerContainer>
          <ChatAnswer style={{ whiteSpace: "pre-wrap" }}>
            {firstQuestion}
          </ChatAnswer>
          <ButtonContainer
            style={{
              backgroundColor: COLOR.answerColor,
              padding: 10,
            }}
            onClick={(e) => {
              handlePlayTts(speakerIndex, firstQuestion, 0);
            }}
          >
            {nowTtsIndex == 0 && isTtsLoading ? (
              <img
                style={{ animation: "rotate 1.5s linear infinite" }}
                src={loadingImage}
                alt="음성 로딩 이미지"
              />
            ) : (
              <img src={soundImage} alt="음성 재생 이미지" />
            )}
          </ButtonContainer>
        </ChatAnswerContainer>

        {transcription.map((item, index) => {
          return (
            <div key={index}>
              {/* 채팅 질문 */}
              <ChatQuestionContainer>
                <ChatQuestion>{transcription[index]}</ChatQuestion>
              </ChatQuestionContainer>

              {/* 채팅 답변 */}
              <ChatAnswerContainer>
                {/* 채팅 답변이 오지 않을때 빈 채팅을 보여주지 않기 위한 로직 */}
                {index < chatResult.length && (
                  <>
                    <ChatAnswer>{chatResult[index]}</ChatAnswer>
                    <ButtonContainer
                      style={{
                        backgroundColor: COLOR.answerColor,
                        padding: 10,
                      }}
                      onClick={(e) => {
                        handlePlayTts(
                          speakerIndex,
                          chatResult[index],
                          index + 1
                        );
                      }}
                    >
                      {nowTtsIndex == index + 1 && isTtsLoading ? (
                        <img
                          style={{ animation: "rotate 1.5s linear infinite" }}
                          src={loadingImage}
                          alt="음성 로딩 이미지"
                        />
                      ) : (
                        <img src={soundImage} alt="음성 재생 이미지" />
                      )}
                    </ButtonContainer>
                  </>
                )}
              </ChatAnswerContainer>
            </div>
          );
        })}
        {/* 채팅 기다리는 중 로직 */}
        {isChatLoading && (
          <ChatAnswerContainer>
            <ChatAnswer>답변을 기다리는 중입니다.</ChatAnswer>
          </ChatAnswerContainer>
        )}

        <div ref={messageEndRef}></div>
      </div>

      {/* 음성 받는 영역 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          padding: "16% 0",
          overflow: "hidden",
          backgroundColor: "#F1F7FF",
        }}
      >
        {recording ? (
          // 음성 받는 상태
          <>
            {/* 사운드 버튼 */}
            <ButtonContainer
              style={{
                backgroundColor: COLOR.primaryColor,
                width: 130,
                height: 130,
                zIndex: 10,
                position: "relative",
              }}
              onClick={(e) => {
                stopRecording();
              }}
            >
              <img
                style={{ width: 74, height: 74 }}
                src={soundLargeImage}
                alt="음성 입력 버튼"
              />

              {/* ~가 듣고 있는 중 텍스트 */}
              <span
                style={{
                  position: "absolute",
                  whiteSpace: "nowrap",
                  color: COLOR.questionFontColor,
                  backgroundColor: "white",
                  borderRadius: 25,
                  fontWeight: 300,
                  fontSize: 18,
                  padding: 10,
                }}
              >{`00가 듣고 있는 중이에요`}</span>
            </ButtonContainer>

            {/* 버튼 감싸고 있는 원 */}
            <div
              style={{
                backgroundColor: COLOR.primaryColor15,
                width: 330,
                height: 330,
                borderRadius: "50%",
                position: "absolute",
              }}
            ></div>
            <div
              style={{
                backgroundColor: COLOR.primaryColor15,
                width: 198,
                height: 198,
                borderRadius: "50%",
                position: "absolute",
              }}
            ></div>
          </>
        ) : // 채팅 클릭시
        isChat ? (
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                backgroundColor: COLOR.primaryColor,
                width: 130,
                height: 130,
                zIndex: 10,
                borderRadius: "50%",
                position: "absolute",
              }}
            ></div>
            <div
              style={{
                padding: 18,
                width: "100%",
                zIndex: 20,
                backgroundColor: "white",
                borderRadius: 28,
                display: "flex",
                gap: 18,
              }}
            >
              <ButtonContainer
                onClick={(e) => {
                  setIsChat(false);
                }}
              >
                <img src={closeImage} alt="" />
              </ButtonContainer>
              <input
                style={{
                  border: "none",
                  fontSize: 20,
                  width: "70%",
                  color: COLOR.questionFontColor
                }}
                type="text"
                onChange={(e) => {
                  setChatText(e.target.value);
                  // console.log(chatText);
                }}
                value={chatText}
              />
              <ButtonContainer
                style={{
                  backgroundColor: COLOR.primaryColor,
                  width: 55,
                  height: 50,
                }}
                onClick={async (e) => {
                  setTranscription([...transcription, chatText]);
                  setIsChatLoading(true);

                  const chatResponse = await requestEliceChat(chatText);

                  requestEliceChatResultHandler(chatResponse);
                  try {
                    const res = await saveChat({
                      question: chatText,
                      answer: chatResponse,
                    });
                    setChatText("");
                  } catch (error) {
                    throw new Error(`채팅 인풋 Error: ${error}`);
                  }
                }}
              >
                <img
                  style={{ position: "relative", bottom: -2, right: -0.5 }}
                  src={textWhiteImage}
                  alt=""
                />
              </ButtonContainer>
            </div>

            {/* 주변원 */}
            <div
              style={{
                backgroundColor: COLOR.primaryColor15,
                width: 330,
                height: 330,
                borderRadius: "50%",
                position: "absolute",
              }}
            ></div>
            <div
              style={{
                backgroundColor: COLOR.primaryColor15,
                width: 198,
                height: 198,
                borderRadius: "50%",
                position: "absolute",
              }}
            ></div>
          </div>
        ) : (
          // 음성 받지 않는 상태
          <ButtonContainer
            style={{
              backgroundColor: COLOR.primaryColor,
              width: 120,
              height: 120,
            }}
            onClick={(e) => {
              startRecording();
            }}
          >
            <img
              style={{ width: 76, height: 58 }}
              src={logoWhiteImage}
              alt="음성 입력 버튼"
            />
          </ButtonContainer>
        )}
        {/* text 입력 받는 버튼 */}
        {!recording && !isChat && (
          <ShadowButtonContainer
            style={{
              backgroundColor: "white",
              width: 72,
              height: 72,
              position: "absolute",
              right: "10%",
            }}
            onClick={(e) => {
              setIsChat(true);
            }}
          >
            <img
              style={{ position: "relative", right: -1, bottom: -2 }}
              src={textImage}
              alt="텍스트 입력 버튼"
            />
          </ShadowButtonContainer>
        )}
      </div>
    </div>
  );

  return mode4;
};
export default SpeechToText;
