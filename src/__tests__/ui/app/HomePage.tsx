function sum(a: number, b: number) {
  return a + b;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let data = [];
beforeEach(() => {
  console.log("beforeAll");
  data = [2, 3, 4, 5];
});

test("adds 2+3 should be equal to 5 ", () => {
  expect(sum(2, 3)).toBe(5);
});

test("object assginment", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { one: 1 };
  data["two"] = 2;
  expect(data).toEqual({ one: 1, two: 2 });
});

test("There is a stop in Christoph", () => {
  expect("Christoph").toMatch(/stop/);
});

async function getResponse() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ value: "Hello World" });
    }, 1000);
  });
}

test("async getResponse should return Hello World", async () => {
  const response = await getResponse();
  expect(response).toEqual({ value: "Hello World" });
});

describe("Combine promise response value", () => {
  test("async getResponse should return Hello World", async () => {
    const response = await getResponse();
    expect(response).toEqual({ value: "Hello World" });
  });

  test("async getResponse should not return abcd", async () => {
    const response = await getResponse();
    expect(response).not.toEqual({ value: "abcd" });
  });
});
